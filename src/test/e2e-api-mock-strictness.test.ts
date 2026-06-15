import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const e2eRoot = path.join(root, 'e2e');

type ApiRouteMock = {
  body: ts.ConciseBody;
  filePath: string;
  line: number;
  pattern: string;
  sourceFile: ts.SourceFile;
};

const serviceWideMockLabels = new Map([
  ['**/api/coinapi/**', 'Unhandled CoinAPI mock'],
  ['**/api/coingecko/**', 'Unhandled CoinGecko mock'],
  ['**/api/thorchain/**', 'Unhandled THORChain mock'],
  ['**/api/midgard/**', 'Unhandled Midgard mock'],
]);

function isJavaScriptOrTypeScriptFile(fileName: string): boolean {
  return /\.[jt]sx?$/.test(fileName);
}

function walkE2eCodeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkE2eCodeFiles(entryPath);
    }

    return isJavaScriptOrTypeScriptFile(entry.name) ? [entryPath] : [];
  });
}

function toProjectPath(filePath: string): string {
  return path.relative(root, filePath);
}

function getStringLiteralText(node: ts.Node | undefined): string | null {
  if (!node) {
    return null;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return null;
}

function isApiWildcardPattern(pattern: string): boolean {
  return pattern === '**/api/**'
    || (pattern.startsWith('**/api/') && (pattern.endsWith('/**') || pattern.endsWith('**')));
}

function getRouteCallbackBody(node: ts.CallExpression): ts.ConciseBody | null {
  const callback = node.arguments[1];

  if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
    return callback.body;
  }

  return null;
}

function collectApiRouteMocks(filePath: string): ApiRouteMock[] {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const mocks: ApiRouteMock[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'route'
    ) {
      const pattern = getStringLiteralText(node.arguments[0]);
      const body = getRouteCallbackBody(node);

      if (pattern && body && isApiWildcardPattern(pattern)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        mocks.push({ body, filePath, line: line + 1, pattern, sourceFile });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return mocks;
}

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return null;
}

function isFailingStatusProperty(property: ts.ObjectLiteralElementLike): boolean {
  if (!ts.isPropertyAssignment(property) || getPropertyNameText(property.name) !== 'status') {
    return false;
  }

  return ts.isNumericLiteral(property.initializer)
    && Number(property.initializer.text) >= 400
    && Number(property.initializer.text) < 600;
}

function isRouteMethodCall(node: ts.CallExpression, methodNames: string[]): boolean {
  return ts.isPropertyAccessExpression(node.expression) && methodNames.includes(node.expression.name.text);
}

function isFailingFulfill(node: ts.CallExpression): boolean {
  if (!isRouteMethodCall(node, ['fulfill'])) {
    return false;
  }

  const options = node.arguments[0];
  return Boolean(
    options
    && ts.isObjectLiteralExpression(options)
    && options.properties.some(isFailingStatusProperty)
  );
}

function containsRouteFailureEscape(node: ts.Node): boolean {
  let found = false;

  function visit(current: ts.Node) {
    if (found) {
      return;
    }

    if (ts.isThrowStatement(current)) {
      found = true;
      return;
    }

    if (
      ts.isCallExpression(current)
      && (isFailingFulfill(current) || isRouteMethodCall(current, ['abort', 'continue', 'fallback']))
    ) {
      found = true;
      return;
    }

    ts.forEachChild(current, visit);
  }

  visit(node);
  return found;
}

function containsLabeledFailingFulfill(node: ts.Node, sourceFile: ts.SourceFile, label: string): boolean {
  let found = false;

  function visit(current: ts.Node) {
    if (found) {
      return;
    }

    if (
      ts.isCallExpression(current)
      && isFailingFulfill(current)
      && current.getText(sourceFile).includes(label)
    ) {
      found = true;
      return;
    }

    ts.forEachChild(current, visit);
  }

  visit(node);
  return found;
}

function containsSubstringMatch(node: ts.Node): boolean {
  let found = false;

  function visit(current: ts.Node) {
    if (found) {
      return;
    }

    if (
      ts.isCallExpression(current)
      && ts.isPropertyAccessExpression(current.expression)
      && current.expression.name.text === 'includes'
    ) {
      found = true;
      return;
    }

    ts.forEachChild(current, visit);
  }

  visit(node);
  return found;
}

function describeMock(mock: ApiRouteMock): string {
  return `${toProjectPath(mock.filePath)}:${mock.line} ${mock.pattern}`;
}

function findTextOccurrences(filePath: string, pattern: RegExp): string[] {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const matches: string[] = [];

  for (const match of source.matchAll(pattern)) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(match.index ?? 0);
    matches.push(`${toProjectPath(filePath)}:${line + 1}`);
  }

  return matches;
}

describe('E2E API mock strictness', () => {
  const routeMocks = walkE2eCodeFiles(e2eRoot).flatMap(collectApiRouteMocks);
  const e2eCodeFiles = walkE2eCodeFiles(e2eRoot);

  it('gives every wildcard API route mock a non-success escape hatch', () => {
    const failures = routeMocks
      .filter((mock) => !containsRouteFailureEscape(mock.body))
      .map(describeMock);

    expect(failures).toEqual([]);
  });

  it('keeps service-wide API mocks explicit about unhandled upstream paths', () => {
    const failures = routeMocks.flatMap((mock) => {
      const label = serviceWideMockLabels.get(mock.pattern);

      if (!label) {
        return [];
      }

      return containsLabeledFailingFulfill(mock.body, mock.sourceFile, label)
        ? []
        : [`${describeMock(mock)} missing ${label}`];
    });

    expect(failures).toEqual([]);
  });

  it('avoids substring path matching in wildcard API route mocks', () => {
    const failures = routeMocks
      .filter((mock) => containsSubstringMatch(mock.body))
      .map(describeMock);

    expect(failures).toEqual([]);
  });

  it('uses explicit THORNode mock names for health probes versus node-data outages', () => {
    const failures = e2eCodeFiles.flatMap((filePath) => (
      findTextOccurrences(filePath, /\bthornodeHealthStatus\b/g)
    ));

    expect(failures).toEqual([]);
  });
});
