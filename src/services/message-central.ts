import axios from 'axios';

const MESSAGECENTRAL_BASE_URL = process.env.MESSAGECENTRAL_BASE_URL || 'https://cpaas.messagecentral.com';
const MESSAGECENTRAL_CUSTOMER_ID = process.env.MESSAGECENTRAL_CUSTOMER_ID || process.env.MESSAGE_CENTRAL_CUSTOMER_ID;
const MESSAGECENTRAL_KEY = process.env.MESSAGECENTRAL_PASSWORD_BASE64 || process.env.MESSAGE_CENTRAL_KEY;
const MESSAGECENTRAL_COUNTRY_CODE = String(process.env.MESSAGECENTRAL_COUNTRY_CODE || '91');

export const normalizeIndianPhone = (phone: string) => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith(MESSAGECENTRAL_COUNTRY_CODE)) {
    return digits.slice(2);
  }

  return digits;
};

export async function generateAuthToken() {
  try {
    if (!MESSAGECENTRAL_CUSTOMER_ID || !MESSAGECENTRAL_KEY) {
      throw new Error('MessageCentral credentials are missing in environment variables.');
    }

    const response = await axios.get(
      `${MESSAGECENTRAL_BASE_URL}/auth/v1/authentication/token`,
      {
        params: {
          customerId: MESSAGECENTRAL_CUSTOMER_ID,
          key: MESSAGECENTRAL_KEY,
          scope: 'NEW',
          country: MESSAGECENTRAL_COUNTRY_CODE,
        },
      }
    );

    const authToken =
      response.data?.token ||
      response.data?.authToken ||
      response.data?.data?.token ||
      response.data?.data?.authToken;

    if (!authToken) {
      throw new Error(
        `Failed to receive authToken from MessageCentral. Response keys: ${Object.keys(
          response.data || {}
        ).join(',')}`
      );
    }

    return authToken;
  } catch (error: any) {
    console.error('MessageCentral token generation error:', error.response?.data || error.message);
    throw error;
  }
}

export async function sendOTPWithMessageCentral(phone: string) {
  try {
    const normalizedPhone = normalizeIndianPhone(phone);
    const authToken = await generateAuthToken();

    const response = await axios.post(
      `${MESSAGECENTRAL_BASE_URL}/verification/v3/send`,
      {},
      {
        params: {
          countryCode: MESSAGECENTRAL_COUNTRY_CODE,
          customerId: MESSAGECENTRAL_CUSTOMER_ID,
          mobileNumber: normalizedPhone,
          flowType: 'SMS',
          otpLength: 4,
        },
        headers: {
          authToken,
        },
      }
    );

    const verificationId =
      response.data?.verificationId ||
      response.data?.data?.verificationId ||
      response.data?.data?.verficationId;

    if (!verificationId) {
      throw new Error(
        `Failed to receive verificationId from MessageCentral. Response keys: ${Object.keys(
          response.data || {}
        ).join(',')}`
      );
    }

    return verificationId;
  } catch (error: any) {
    console.error('MessageCentral send OTP error:', error.response?.data || error.message);
    throw error;
  }
}

export async function verifyOTPWithMessageCentral(verificationId: string, otp: string, phone: string) {
  try {
    const normalizedPhone = normalizeIndianPhone(phone);
    const authToken = await generateAuthToken();

    const response = await axios.get(
      `${MESSAGECENTRAL_BASE_URL}/verification/v3/validateOtp`,
      {
        params: {
          verificationId,
          code: otp,
          flowType: 'SMS',
          customerId: MESSAGECENTRAL_CUSTOMER_ID,
          countryCode: MESSAGECENTRAL_COUNTRY_CODE,
          mobileNumber: normalizedPhone,
        },
        headers: {
          authToken,
        },
      }
    );

    const verificationStatus =
      response.data?.data?.verificationStatus ||
      response.data?.data?.verficationStatus ||
      response.data?.verificationStatus;
      
    if (verificationStatus && verificationStatus !== 'VERIFICATION_COMPLETED') {
      throw new Error('OTP verification failed.');
    }

    return response.data;
  } catch (error: any) {
    console.error('MessageCentral OTP verification error:', error.response?.data || error.message);
    throw error;
  }
}
