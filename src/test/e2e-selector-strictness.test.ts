import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const e2eRoot = path.join(root, 'e2e');
const orderedCollectionException = /e2e-selector-order-ok:\s+\S/;
const orderedSelectorMethods = ['first', 'nth', 'last'] as const;
const orderedSelectorMethodSet = new Set<string>(orderedSelectorMethods);

type OrderedSelectorCall = {
  filePath: string;
  line: number;
  method: OrderedSelectorMethod;
  source: string;
};

type OrderedSelectorMethod = (typeof orderedSelectorMethods)[number];

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

function isOrderedSelectorMethod(value: string): value is OrderedSelectorMethod {
  return orderedSelectorMethodSet.has(value);
}

function getOrderedSelectorMethod(expression: ts.Expression): OrderedSelectorMethod | null {
  if (ts.isPropertyAccessExpression(expression)) {
    return isOrderedSelectorMethod(expression.name.text) ? expression.name.text : null;
  }

  if (
    ts.isElementAccessExpression(expression)
    && ts.isStringLiteralLike(expression.argumentExpression)
    && isOrderedSelectorMethod(expression.argumentExpression.text)
  ) {
    return expression.argumentExpression.text;
  }

  return null;
}

function isCommentedStatement(node: ts.Node): boolean {
  return ts.isExpressionStatement(node)
    || ts.isVariableStatement(node)
    || ts.isReturnStatement(node)
    || ts.isThrowStatement(node)
    || ts.isIfStatement(node)
    || ts.isForStatement(node)
    || ts.isForOfStatement(node)
    || ts.isForInStatement(node)
    || ts.isWhileStatement(node)
    || ts.isDoStatement(node)
    || ts.isSwitchStatement(node);
}

function findContainingStatement(node: ts.Node): ts.Node {
  let current: ts.Node = node;

  while (current.parent && !ts.isSourceFile(current.parent)) {
    if (isCommentedStatement(current.parent)) {
      return current.parent;
    }

    current = current.parent;
  }

  return current;
}

function hasOrderedCollectionException(
  source: string,
  node: ts.Node,
): boolean {
  const statement = findContainingStatement(node);
  const leading = ts.getLeadingCommentRanges(source, statement.getFullStart()) ?? [];
  const trailing = ts.getTrailingCommentRanges(source, statement.getEnd()) ?? [];

  return [...leading, ...trailing].some((comment) => {
    const commentText = source.slice(comment.pos, comment.end);
    return orderedCollectionException.test(commentText);
  });
}

function collectOrderedSelectorCallsFromSource(
  filePath: string,
  source: string,
): OrderedSelectorCall[] {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const calls: OrderedSelectorCall[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const method = getOrderedSelectorMethod(node.expression);

      if (!method) {
        ts.forEachChild(node, visit);
        return;
      }

      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

      if (!hasOrderedCollectionException(source, node)) {
        calls.push({
          filePath,
          line: line + 1,
          method,
          source: node.getText(sourceFile),
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

function collectOrderedSelectorCalls(filePath: string): OrderedSelectorCall[] {
  return collectOrderedSelectorCallsFromSource(filePath, readFileSync(filePath, 'utf8'));
}

function describeSelectorCall(call: OrderedSelectorCall): string {
  return `${toProjectPath(call.filePath)}:${call.line} .${call.method}() ${call.source}`;
}

describe('E2E selector strictness', () => {
  it('detects unannotated ordered selector shortcuts', () => {
    const violations = collectOrderedSelectorCallsFromSource(
      path.join(e2eRoot, 'example.spec.ts'),
      [
        "const pageTitle = page.getByRole('heading', { name: /Heimdall/ });",
        'await pageTitle.first().click();',
        "await page.getByRole('row').nth(2).click();",
        "await page.getByRole('row').last().click();",
        "await page.getByRole('row')['first']().click();",
      ].join('\n'),
    ).map(describeSelectorCall);

    expect(violations).toEqual([
      "e2e/example.spec.ts:2 .first() pageTitle.first()",
      "e2e/example.spec.ts:3 .nth() page.getByRole('row').nth(2)",
      "e2e/example.spec.ts:4 .last() page.getByRole('row').last()",
      "e2e/example.spec.ts:5 .first() page.getByRole('row')['first']()",
    ]);
  });

  it('requires a reasoned exception for intentional ordered collections', () => {
    const violations = collectOrderedSelectorCallsFromSource(
      path.join(e2eRoot, 'example.spec.ts'),
      [
        "const rows = page.getByRole('table', { name: /Pools/ }).getByRole('row');",
        '// e2e-selector-order-ok: verifies sorted pool rows',
        'await expect(rows.nth(1)).toContainText(/BTC/);',
        'await rows.last().click();',
        '// e2e-selector-order-ok:',
        'await rows.first().click();',
      ].join('\n'),
    ).map(describeSelectorCall);

    expect(violations).toEqual([
      'e2e/example.spec.ts:4 .last() rows.last()',
      'e2e/example.spec.ts:6 .first() rows.first()',
    ]);
  });

  it('rejects unannotated ordered locator shortcuts in browser specs', () => {
    const violations = walkE2eCodeFiles(e2eRoot)
      .flatMap(collectOrderedSelectorCalls)
      .map(describeSelectorCall);

    expect(violations).toEqual([]);
  });
});
