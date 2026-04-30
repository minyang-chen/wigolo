import { join } from 'node:path';
import { getConfig } from '../../config.js';
import { getModel, resolveModelId } from './models.js';

export type TokenizerPair = {
  input_ids: BigInt64Array;
  attention_mask: BigInt64Array;
  token_type_ids: BigInt64Array;
  length: number;
};

type EncodeOpts = {
  text_pair: string;
  max_length: number;
  truncation: true;
  padding: 'max_length';
};

type EncodedTensor = { data: BigInt64Array; dims: number[] };

type EncoderTokenizer = {
  encode: (q: string, opts: EncodeOpts) => {
    input_ids: EncodedTensor;
    attention_mask: EncodedTensor;
    token_type_ids?: EncodedTensor;
  };
};

let xenovaModule: typeof import('@xenova/transformers') | null = null;
async function loadXenova() {
  if (!xenovaModule) xenovaModule = await import('@xenova/transformers');
  return xenovaModule;
}

const tokenizerCache = new Map<string, unknown>();

export async function loadTokenizer(modelId: string, dataDir?: string): Promise<unknown> {
  const id = resolveModelId(modelId);
  const cached = tokenizerCache.get(id);
  if (cached) return cached;
  getModel(id);
  const dir = dataDir ?? getConfig().dataDir;
  const xenova = await loadXenova();
  xenova.env.allowLocalModels = true;
  xenova.env.allowRemoteModels = false;
  xenova.env.localModelPath = join(dir, 'models');
  const tokenizer = await xenova.AutoTokenizer.from_pretrained(id, { local_files_only: true });
  tokenizerCache.set(id, tokenizer);
  return tokenizer;
}

export function tokenizePair(
  tokenizer: EncoderTokenizer,
  query: string,
  doc: string,
  maxLength = 512,
): TokenizerPair {
  const enc = tokenizer.encode(query, {
    text_pair: doc,
    max_length: maxLength,
    truncation: true,
    padding: 'max_length',
  });
  const length = enc.input_ids.dims[1];
  const tokenTypeIds = enc.token_type_ids?.data ?? new BigInt64Array(length);
  return {
    input_ids: enc.input_ids.data,
    attention_mask: enc.attention_mask.data,
    token_type_ids: tokenTypeIds,
    length,
  };
}

export function _resetTokenizerCache(): void {
  tokenizerCache.clear();
}
