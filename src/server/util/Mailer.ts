/* eslint-disable @typescript-eslint/no-var-requires */
import { getConfig } from '../../../config/main.config';
import { MailOptions } from 'nodemailer/lib/json-transport';
const nodemailer = require('nodemailer');

export function MailService() {
  this.transporter;
  const configurationGlobal = getConfig();

  this.initialize = () => {
    if (typeof this.transporter !== 'undefined') {
      return;
    }

    const smtpSettings = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secureConnection: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    this.transporter = nodemailer.createTransport(smtpSettings);
  };

  this.sendMail = async (params: MailOptions) => {
    this.initialize();

    if (typeof params == 'undefined') {
      configurationGlobal
        .log()
        .error('Error: Params is required to send an email');
      return;
    }
    if (typeof params.to == 'undefined') {
      configurationGlobal.log().error('Error: To is required to send an email');
      return;
    }
    if (typeof params.subject == 'undefined') {
      configurationGlobal
        .log()
        .error('Error: Subject is required to send an email');
      return;
    }
    if (typeof params.html == 'undefined') {
      configurationGlobal
        .log()
        .error('Error: Html message is required to send an email');
      return;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      html: params.html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      configurationGlobal.log().info('Email sent:' + info.response);
    } catch (error) {
      configurationGlobal
        .log()
        .error('Error while send message on error for mail' + error);
    }
  };
}
