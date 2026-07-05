export const HAND_MODEL_FILE = "advisor-policy-v9.onnx";
export const SHOP_MODEL_FILE = "advisor-shop-policy-v15.onnx";

export const HAND_MODEL_URL = `/models/${HAND_MODEL_FILE}`;
export const SHOP_MODEL_SERVING_URL = `/models/${SHOP_MODEL_FILE}`;

export const HAND_MODEL_REPO_PATH = `public/models/${HAND_MODEL_FILE}`;
export const SHOP_MODEL_REPO_PATH = `public/models/${SHOP_MODEL_FILE}`;

export const HAND_MODEL_ID = HAND_MODEL_FILE.replace(/\.onnx$/, "");
export const SHOP_MODEL_ID = SHOP_MODEL_FILE.replace(/\.onnx$/, "");
