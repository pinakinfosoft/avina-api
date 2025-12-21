import crypto from "crypto";
import { Request, RequestHandler, Response } from "express";
import { PUBLIC_AUTHORIZATION_TOKEN } from "../config/env.var";
import { CIPHER_ALGORITHM } from "../utils/app-constants";
import { DEFAULT_STATUS_CODE_ERROR } from "../utils/app-messages";
import { decryptRequestData, resUnknownError } from "../utils/shared-functions";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extended Request interface with company key in params
 */
interface ICompanyKeyRequest extends Request {
  params: {
    company_key?: string;
    [key: string]: string | undefined;
  };
  body: {
    db_connection?: unknown;
    [key: string]: unknown;
  };
}

// ============================================================================
// ENCRYPTION/DECRYPTION UTILITIES
// ============================================================================

/**
 * Encrypts data using AES cipher
 * @param data - Data string to encrypt
 * @param cipherKey - Encryption key buffer
 * @param cipherIv - Initialization vector buffer
 * @returns Encrypted data as base64 string
 */
const encryptData = (
  data: string,
  cipherKey: Buffer,
  cipherIv: Buffer
): string => {
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, cipherKey, cipherIv);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};

/**
 * Decrypts data using AES cipher
 * @param data - Encrypted data as base64 string
 * @param decipherKey - Decryption key buffer
 * @param decipherIv - Initialization vector buffer
 * @returns Decrypted data as UTF-8 string
 */
const decryptData = (
  data: string,
  decipherKey: Buffer,
  decipherIv: Buffer
): string => {
  const decipher = crypto.createDecipheriv(
    CIPHER_ALGORITHM,
    decipherKey,
    decipherIv
  );
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

// ============================================================================
// REQUEST BODY DECODER MIDDLEWARE
// ============================================================================

/**
 * Request body decoder middleware
 * Currently a pass-through middleware that can be extended for future decryption needs
 * 
 * @example
 * ```typescript
 * app.use(bodyDecipher);
 * ```
 */
export const bodyDecipher: RequestHandler = (
  req: Request,
  res: Response,
  next
) => {
  try {
    // Future: Add request body decryption logic here if needed
    // Currently, decryption is handled in the authenticate middleware
    return next();
  } catch (error) {
    return res
      .status(DEFAULT_STATUS_CODE_ERROR)
      .send(resUnknownError({ data: error }));
  }
};

// ============================================================================
// COMPANY KEY DECRYPTION MIDDLEWARE
// ============================================================================

/**
 * Decrypts company key from URL parameters
 * 
 * This middleware:
 * - Extracts company_key from request parameters
 * - Decrypts the company key if present
 * - Sets db_connection to null for public API access (single database instance)
 * 
 * @example
 * ```typescript
 * app.use('/api/:company_key', decryptCompanyInfoKeyForParams);
 * ```
 */
export const decryptCompanyInfoKeyForParams: RequestHandler = async (
  req: ICompanyKeyRequest,
  res: Response,
  next
) => {
  try {
    // Check if company_key exists in params
    if (!req?.params?.company_key) {
      return next();
    }

    // Decrypt company key from params
    const encryptedCompanyKey = req.params.company_key;
    const decryptedCompanyKey = decryptRequestData(encryptedCompanyKey);

    // Validate decrypted company key
    if (!decryptedCompanyKey || decryptedCompanyKey === "") {
      return res
        .status(DEFAULT_STATUS_CODE_ERROR)
        .send(resUnknownError({ data: "Invalid company key" }));
    }

    return next();
  } catch (error) {
    return res
      .status(DEFAULT_STATUS_CODE_ERROR)
      .send(resUnknownError({ data: error }));
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

// Export encryption/decryption utilities for potential future use
export { encryptData, decryptData };
