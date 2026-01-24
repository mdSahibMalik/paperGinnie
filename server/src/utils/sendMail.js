import nodeMailer from "nodemailer";

export const sendMail = async ({message, email, subject, next}) => {
  try {
    const transporter = nodeMailer.createTransport({
      host: process.env.SMTP_HOST,
      service: process.env.SMTP_SERVICE,
      port: process.env.SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL,
        pass: process.env.GMAIL_PASSOWORD,
      },
    });

    const option = {
      from: process.env.EMAIL,
      to: email,
      subject: subject,
      html: message,
    };

    await transporter.sendMail(option);
    
  } catch (error) {
   return "something went wrong";
  }
};
