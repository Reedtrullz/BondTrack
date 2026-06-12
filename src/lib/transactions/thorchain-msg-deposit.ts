import { fromBech32 } from '@cosmjs/encoding';
import { Registry, type GeneratedType } from '@cosmjs/proto-signing';
import { BinaryReader, BinaryWriter } from 'cosmjs-types/binary';

export const THORCHAIN_MSG_DEPOSIT_TYPE_URL = '/types.MsgDeposit';
export const THORCHAIN_DEPOSIT_GAS_LIMIT = '600000000';

export interface ThorchainAsset {
  chain: string;
  symbol: string;
  ticker: string;
  synth: boolean;
  trade: boolean;
  secured: boolean;
}

export interface ThorchainCoin {
  asset?: ThorchainAsset;
  amount: string;
  decimals?: bigint;
}

export interface ThorchainMsgDeposit {
  coins: ThorchainCoin[];
  memo: string;
  signer: Uint8Array;
}

export const RUNE_THORCHAIN_ASSET: ThorchainAsset = {
  chain: 'THOR',
  symbol: 'RUNE',
  ticker: 'RUNE',
  synth: false,
  trade: false,
  secured: false,
};

function createBaseAsset(): ThorchainAsset {
  return {
    chain: '',
    symbol: '',
    ticker: '',
    synth: false,
    trade: false,
    secured: false,
  };
}

function createBaseCoin(): ThorchainCoin {
  return {
    amount: '',
  };
}

function createBaseMsgDeposit(): ThorchainMsgDeposit {
  return {
    coins: [],
    memo: '',
    signer: new Uint8Array(),
  };
}

function encodeAsset(message: ThorchainAsset, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
  if (message.chain !== undefined) writer.uint32(10).string(message.chain);
  if (message.symbol !== undefined) writer.uint32(18).string(message.symbol);
  if (message.ticker !== undefined) writer.uint32(26).string(message.ticker);
  if (message.synth !== undefined) writer.uint32(32).bool(message.synth);
  if (message.trade !== undefined) writer.uint32(40).bool(message.trade);
  if (message.secured !== undefined) writer.uint32(48).bool(message.secured);
  return writer;
}

function decodeAsset(input: BinaryReader | Uint8Array, length?: number): ThorchainAsset {
  const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
  const end = length === undefined ? reader.len : reader.pos + length;
  const message = createBaseAsset();

  while (reader.pos < end) {
    const tag = reader.uint32();
    switch (tag >>> 3) {
      case 1:
        message.chain = reader.string();
        break;
      case 2:
        message.symbol = reader.string();
        break;
      case 3:
        message.ticker = reader.string();
        break;
      case 4:
        message.synth = reader.bool();
        break;
      case 5:
        message.trade = reader.bool();
        break;
      case 6:
        message.secured = reader.bool();
        break;
      default:
        reader.skipType(tag & 7);
        break;
    }
  }

  return message;
}

function encodeCoin(message: ThorchainCoin, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
  if (message.asset !== undefined) {
    encodeAsset(message.asset, writer.uint32(10).fork()).ldelim();
  }
  if (message.amount !== undefined) writer.uint32(18).string(message.amount);
  if (message.decimals !== undefined) writer.uint32(24).int64(message.decimals);
  return writer;
}

function decodeCoin(input: BinaryReader | Uint8Array, length?: number): ThorchainCoin {
  const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
  const end = length === undefined ? reader.len : reader.pos + length;
  const message = createBaseCoin();

  while (reader.pos < end) {
    const tag = reader.uint32();
    switch (tag >>> 3) {
      case 1:
        message.asset = decodeAsset(reader, reader.uint32());
        break;
      case 2:
        message.amount = reader.string();
        break;
      case 3:
        message.decimals = reader.int64();
        break;
      default:
        reader.skipType(tag & 7);
        break;
    }
  }

  return message;
}

export const ThorchainMsgDepositGeneratedType: GeneratedType = {
  encode(message: ThorchainMsgDeposit, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    for (const coin of message.coins) {
      encodeCoin(coin, writer.uint32(10).fork()).ldelim();
    }
    if (message.memo !== undefined) writer.uint32(18).string(message.memo);
    if (message.signer !== undefined) writer.uint32(26).bytes(message.signer);
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): ThorchainMsgDeposit {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDeposit();

    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.coins.push(decodeCoin(reader, reader.uint32()));
          break;
        case 2:
          message.memo = reader.string();
          break;
        case 3:
          message.signer = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }

    return message;
  },

  fromPartial(object: Partial<ThorchainMsgDeposit>): ThorchainMsgDeposit {
    return {
      coins: object.coins?.map((coin) => ({
        asset: coin.asset ? { ...RUNE_THORCHAIN_ASSET, ...coin.asset } : undefined,
        amount: coin.amount ?? '',
        decimals: coin.decimals,
      })) ?? [],
      memo: object.memo ?? '',
      signer: object.signer ?? new Uint8Array(),
    };
  },
};

export function createThorchainSigningRegistry(): Registry {
  return new Registry([[THORCHAIN_MSG_DEPOSIT_TYPE_URL, ThorchainMsgDepositGeneratedType]]);
}

export function createRuneDepositMessage(
  signerAddress: string,
  memo: string,
  amountBaseUnits: string
): ThorchainMsgDeposit {
  return {
    signer: fromBech32(signerAddress).data,
    memo,
    coins: [
      {
        asset: RUNE_THORCHAIN_ASSET,
        amount: amountBaseUnits,
      },
    ],
  };
}
