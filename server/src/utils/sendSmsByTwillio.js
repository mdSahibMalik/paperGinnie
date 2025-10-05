import twilio from "twilio";
const sendMobileSmsByTwilio = async (mobileNumber, code) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
  
  // Initialize the Twilio client
  const client = twilio(accountSid, authToken);
  try {
    const message = await client.messages.create({
      body: `Verify your mobile for paperGinnie ${code}`,
      from: TWILIO_PHONE_NUMBER,
      to: `+91${mobileNumber}`,
    });
    return message;
    
  } catch (error) {
    return 'something went wront'
  }
}
export  {sendMobileSmsByTwilio};
