/**
 * 로깅 유틸리티
 */
export const logger = {
  info: (context, message) => {
    console.log(`ℹ️ [${context}] ${message}`);
  },

  success: (context, message) => {
    console.log(`✅ [${context}] ${message}`);
  },

  error: (context, message, error = null) => {
    console.error(`❌ [${context}] ${message}`);
    if (error) {
      console.error(error);
    }
  },

  warn: (context, message) => {
    console.log(`⚠️ [${context}] ${message}`);
  },

  debug: (context, message) => {
    console.log(`🔍 [${context}] ${message}`);
  },
};
