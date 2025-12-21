import { Request, RequestHandler, Response } from "express";
import multer, { MulterError } from "multer";
import path from "path";
import {
  PRODUCT_BULK_UPLOAD_FILE_SIZE,
  STORE_TEMP_FILE_PATH,
  STORE_TEMP_VIDEO_PATH,
} from "../config/env.var";
import { createFolderIfNot } from "../helpers/file.helper";
import { DEFAULT_STATUS_CODE_ERROR } from "../utils/app-messages";
import {
  generateRandomString,
  resUnknownError,
} from "../utils/shared-functions";
import { MulterCustomError } from "../helpers/custom-error.helper";
import dbContext from "../config/db-context";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extended Request interface with preserved session and connection
 */
interface IExtendedRequest extends Request {
  body: {
    session_res?: unknown;
    db_connection?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Multer field configuration
 */
interface IMulterField {
  name: string;
  maxCount?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Preserves session and database connection from request body
 * Multer may overwrite req.body, so we need to restore these values
 * @param req - Express request object
 * @returns Object containing session_res and db_connection
 */
const preserveRequestData = (req: IExtendedRequest): {
  session_res?: unknown;
} => {
  return {
    session_res: req.body.session_res,
  };
};

/**
 * Restores session and database connection to request body
 * @param req - Express request object
 * @param preservedData - Preserved session and connection data
 */
const restoreRequestData = (
  req: IExtendedRequest,
  preservedData: { session_res?: unknown; db_connection?: unknown }
): void => {
  req.body["session_res"] = preservedData.session_res;
};

/**
 * Handles multer upload errors
 * @param err - Multer error
 * @param res - Express response object
 * @returns True if error was handled, false otherwise
 */
const handleMulterError = (err: unknown, res: Response): boolean => {
  if (err instanceof MulterError) {
    res.status(DEFAULT_STATUS_CODE_ERROR).send(resUnknownError({ data: err }));
    return true;
  }

  if (err instanceof MulterCustomError) {
    res.status(DEFAULT_STATUS_CODE_ERROR).send(err.getData());
    return true;
  }

  if (err instanceof Error) {
    res.status(DEFAULT_STATUS_CODE_ERROR).send(resUnknownError({ data: err }));
    return true;
  }

  return false;
};

/**
 * Creates a multer instance with optional limits
 * @param options - Multer options
 * @returns Configured multer instance
 */
const createMulterInstance = (options?: multer.Options): multer.Multer => {
  return multer({
    limits: options?.limits,
  });
};

/**
 * Creates a multer instance with disk storage
 * @param destinationPath - Destination directory path
 * @param options - Multer options
 * @returns Configured multer instance with disk storage
 */
const createMulterWithDiskStorage = (
  destinationPath: string,
  options?: multer.Options
): multer.Multer => {
  // Ensure destination directory exists
  createFolderIfNot(destinationPath);

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, destinationPath);
      },
      filename: (_req, file, cb) => {
        // Sanitize filename
        const imagePath = file.originalname
          .replace(/\s|\(|\)/g, "_")
          .replace(/\.[^/.]+$/, "");
        const ext = path.extname(file.originalname);

        // Generate unique filename
        const filename = `${imagePath.toLowerCase()}-${generateRandomString(32)}${ext}`;
        cb(null, filename);
      },
    }),
    limits: options?.limits,
  });
};

/**
 * Creates a generic file parser middleware wrapper
 * @param multerMiddleware - Multer middleware function
 * @returns Request handler middleware
 */
const createFileParserMiddleware = (
  multerMiddleware: (req: Request, res: Response, callback: (err: unknown) => void) => void
): RequestHandler => {
  return (req: IExtendedRequest, res: Response, next) => {
    try {
      const preservedData = preserveRequestData(req);

      multerMiddleware(req, res, (err: unknown) => {
        if (err) {
          if (handleMulterError(err, res)) {
            return;
          }
          return res
            .status(DEFAULT_STATUS_CODE_ERROR)
            .send(resUnknownError({ data: err }));
        }

        restoreRequestData(req, preservedData);
        return next();
      });
    } catch (error) {
      return res
        .status(DEFAULT_STATUS_CODE_ERROR)
        .send(resUnknownError({ data: error }));
    }
  };
};

// ============================================================================
// SINGLE FILE PARSERS
// ============================================================================

/**
 * Single image file parser middleware
 * Parses a single image file from the specified field name
 * @param fieldName - Form field name for the image file
 * @returns Request handler middleware
 * 
 * @example
 * ```typescript
 * app.post('/upload', reqSingleImageParser('image'), (req, res) => {
 *   const file = req.file;
 *   // Handle uploaded file
 * });
 * ```
 */
export const reqSingleImageParser = (
  fieldName: string
): RequestHandler => {
  const multerInstance = createMulterInstance();
  const multerMiddleware = multerInstance.single(fieldName);

  return createFileParserMiddleware(multerMiddleware);
};

/**
 * Product bulk upload file parser middleware
 * Handles large file uploads for product bulk operations
 * @param fieldName - Form field name for the file
 * @returns Request handler middleware
 * 
 * @example
 * ```typescript
 * app.post('/bulk-upload', reqProductBulkUploadFileParser('csvFile'), handler);
 * ```
 */
export const reqProductBulkUploadFileParser = (
  fieldName: string
): RequestHandler => {
  const fileSizeLimit = PRODUCT_BULK_UPLOAD_FILE_SIZE * 1024 * 1024; // Convert MB to bytes

  const multerInstance = createMulterWithDiskStorage(STORE_TEMP_FILE_PATH, {
    limits: { fileSize: fileSizeLimit },
  });

  const multerMiddleware = multerInstance.single(fieldName);

  return createFileParserMiddleware(multerMiddleware);
};

/**
 * Product bulk ZIP file parser middleware
 * Handles ZIP file uploads for product bulk operations
 * @param fieldName - Form field name for the ZIP file
 * @returns Request handler middleware
 * 
 * @example
 * ```typescript
 * app.post('/bulk-upload-zip', reqProductBulkZipFileParser('zipFile'), handler);
 * ```
 */
export const reqProductBulkZipFileParser = (
  fieldName: string
): RequestHandler => {
  // Ensure directory exists
  createFolderIfNot(STORE_TEMP_FILE_PATH);

  const multerInstance = createMulterInstance();
  const multerMiddleware = multerInstance.single(fieldName);

  return createFileParserMiddleware(multerMiddleware);
};

// ============================================================================
// MULTIPLE FILE PARSERS
// ============================================================================

/**
 * Multiple image file parser middleware
 * Parses multiple image files from specified field names (one file per field)
 * @param fieldArray - Array of form field names
 * @returns Request handler middleware
 * 
 * @example
 * ```typescript
 * app.post('/upload', reqMultiImageParser(['image1', 'image2']), handler);
 * ```
 */
export const reqMultiImageParser = (
  fieldArray: string[]
): RequestHandler => {
  const multerInstance = createMulterInstance();
  const fields: IMulterField[] = fieldArray.map((name) => ({
    name,
    maxCount: 1,
  }));

  const multerMiddleware = multerInstance.fields(fields);

  return createFileParserMiddleware(multerMiddleware);
};

/**
 * Array image parser middleware
 * Parses multiple image files from specified field names (unlimited files per field)
 * @param fieldArray - Array of form field names
 * @returns Request handler middleware
 * 
 * @example
 * ```typescript
 * app.post('/upload', reqArrayImageParser(['images']), handler);
 * ```
 */
export const reqArrayImageParser = (
  fieldArray: string[]
): RequestHandler => {
  const multerInstance = createMulterInstance();
  const fields: IMulterField[] = fieldArray.map((name) => ({ name }));

  const multerMiddleware = multerInstance.fields(fields);

  return createFileParserMiddleware(multerMiddleware);
};

/**
 * Array video parser middleware
 * Parses multiple video files from specified field names
 * @param fieldArray - Array of form field names
 * @returns Request handler middleware
 * 
 * @example
 * ```typescript
 * app.post('/upload', reqArrayVideoParser(['videos']), handler);
 * ```
 */
export const reqArrayVideoParser = (
  fieldArray: string[]
): RequestHandler => {
  const multerInstance = createMulterInstance();
  const fields: IMulterField[] = fieldArray.map((name) => ({ name }));

  const multerMiddleware = multerInstance.fields(fields);

  return createFileParserMiddleware(multerMiddleware);
};

// ============================================================================
// ANY TYPE PARSERS
// ============================================================================

/**
 * Any type image/file parser middleware
 * Accepts any file type from any field name
 * Use with caution - accepts all files without validation
 * @returns Request handler middleware
 * 
 * @example
 * ```typescript
 * app.post('/upload', reqAnyTypeImageAnyFormat(), handler);
 * ```
 */
export const reqAnyTypeImageAnyFormat = (): RequestHandler => {
  const multerInstance = multer();
  const multerMiddleware = multerInstance.any();

  return (req: IExtendedRequest, res: Response, next) => {
    try {
      const preservedData = preserveRequestData(req);

      multerMiddleware(req, res, (err: unknown) => {
        if (err) {
          if (handleMulterError(err, res)) {
            return;
          }
          return res
            .status(DEFAULT_STATUS_CODE_ERROR)
            .send(resUnknownError({ data: err }));
        }

        return next();
      });
    } catch (error) {
      return res
        .status(DEFAULT_STATUS_CODE_ERROR)
        .send(resUnknownError({ data: error }));
    }
  };
};
