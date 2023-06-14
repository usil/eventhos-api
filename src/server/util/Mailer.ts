/* eslint-disable @typescript-eslint/no-var-requires */
import { getConfig } from '../../../config/main.config';
import { MailOptions } from 'nodemailer/lib/json-transport';
import { Transporter } from 'nodemailer';
const nodemailer = require('nodemailer');

interface ISmtpParams {
  smtpHost: string;
  smtpPort: string | number;
  smtpSecure: boolean;
  smtpTlsCiphers: string;
  smtpUser: string;
  smtpPassword: string
  smtpAlias?: string;
}

class MailService {
  protected transporter: Transporter ;
  private configurationGlobal = getConfig();

  protected initialize = (smtpParams: ISmtpParams) => {
    if (typeof this.transporter !== 'undefined') {
      return;
    }
    const smtpSettings = {
      host: smtpParams?.smtpHost,
      port: smtpParams?.smtpPort,
      secure: smtpParams?.smtpSecure ?? true,
      tls: {
        ciphers: smtpParams?.smtpTlsCiphers ?? 'SSLv3',
      },
      auth: {
        user: smtpParams?.smtpUser,
        pass: smtpParams?.smtpPassword,
      },
    };

    this.transporter = nodemailer.createTransport(smtpSettings);
  };

  public sendMail = async (params: MailOptions & ISmtpParams) => {
    this.initialize(params);

    if (typeof params == "undefined" || !params) {
      this.configurationGlobal
        .log()
        .error('Error: Params is required to send an email');
      return;
    }
    if (typeof params.to == 'undefined') {
      this.configurationGlobal.log().error('Error: To is required to send an email');
      return;
    }
    if (typeof params.subject == 'undefined') {
      this.configurationGlobal
        .log()
        .error('Error: Subject is required to send an email');
      return;
    }
    if (typeof params.html == 'undefined') {
      this.configurationGlobal
        .log()
        .error('Error: Html message is required to send an email');
      return;
    }

    const mailOptions = {
      from: params?.smtpAlias ?? params?.smtpUser,
      to: params.to,
      subject: params.subject,
      html: params.html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.configurationGlobal.log().info('Email sent:' + info.response);
      return info;
    } catch (error) {
      this.configurationGlobal
        .log()
        .error('Error while send message on error for mail');
      this.configurationGlobal
        .log()
        .error(error);
    }
  };

  public getSubject = () : string => {
    const subjectMode = this.configurationGlobal.smtp.subjectMode;
    const subject = `Eventhos ${subjectMode && !subjectMode.includes("${") ? "[" + subjectMode + "]" : ""} error notification ` + new Date();
    return subject;
  }
}

export default MailService;