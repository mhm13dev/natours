const nodeMailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

// new Email(user, url)
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.EMAIL_FROM;
  }

  // Create a Transporter for Sending Emails
  createNewTransporter() {
    if (process.env.NODE_ENV === 'production') {
      // MAILJET
      return nodeMailer.createTransport({
        host: process.env.MAILJET_HOST,
        port: process.env.MAILJET_PORT,
        auth: {
          user: process.env.MAILJET_USERNAME,
          pass: process.env.MAILJET_PASSWORD
        }
      });
    }
    return nodeMailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    // Create HTML from a Pug Template and populate it with data
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      name: this.firstName,
      url: this.url,
      subject
    });

    // set mailOptions
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html)
    };

    // Send Mail
    await this.createNewTransporter().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordResetToken() {
    await this.send(
      'passwordReset',
      'Natours: Password Reset Token (Expires in 10 Minutes)'
    );
  }
};
