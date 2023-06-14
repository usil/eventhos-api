/* eslint-disable @typescript-eslint/no-var-requires */
import { getConfig } from '../../../config/main.config';
import { MailOptions } from 'nodemailer/lib/json-transport';
import { Transporter } from 'nodemailer';
import { EventContract } from '../controllers/event.controller';
import { AxiosRequestConfig } from 'axios';
import { objectObfuscate, stringObfuscate } from '../../helpers/general';
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

export interface IParamsHTML {
  eventContractContractIdentifier: string;
  eventContractEventIdentifier: string;
  eventContractEventDescription: string;
  eventContractSystemProducerName: string;
  eventContractSystemProducerDescription: string;
  eventContractActionIdentifier: string;
  eventContractActionDescription: string;
  eventContractSystemConsumerName: string;
  eventContractSystemConsumerDescription: string;
  receivedEventId: string;
  parsedReqUrl: string;
  parsedBody: Record<string, any>;
  parsedReqHeaders: Record<string, any>;
  errorResponseRequestResponseUrl: string;
  errorResponseStatus: string;
  errorResponseData: string;
  errorResponseHeaders: any;
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
  };

  public replaceHtmlToSendByMail = (
    mailTemplate: string, 
    date: string, 
    rawSensibleParams: string, 
    paramsHtml: IParamsHTML
  ): string => {
    const { 
      eventContractContractIdentifier,
      eventContractEventIdentifier,
      eventContractEventDescription,
      eventContractSystemProducerName,
      eventContractSystemProducerDescription,
      eventContractActionIdentifier,
      eventContractActionDescription,
      eventContractSystemConsumerName,
      eventContractSystemConsumerDescription,
      receivedEventId,
      parsedReqUrl,
      parsedBody,
      parsedReqHeaders,
      errorResponseRequestResponseUrl,
      errorResponseStatus,
      errorResponseData,
      errorResponseHeaders
    } = paramsHtml;
    /* const params = {
      eventContractContractIdentifier,
      eventContractEventIdentifier,
      eventContractEventDescription,
      eventContractSystemProducerName,
      eventContractSystemProducerDescription,
      eventContractActionIdentifier,
      eventContractActionDescription,
      eventContractSystemConsumerName,
      eventContractSystemConsumerDescription,
      receivedEventId,
      parsedReqUrl,
      parsedBody,
      parsedReqHeaders,
      errorResponseRequestResponseUrl,
      errorResponseStatus,
      errorResponseData,
      errorResponseHeaders
    } */
    /* mailTemplate = mailTemplate.replace('@contract', eventContract.contract.identifier);
    mailTemplate = mailTemplate.replace(
      '@when',
      eventContract.event.identifier +
      ' - ' +
      eventContract.event.description,
    );
    mailTemplate = mailTemplate.replace(
      '@inWhen',
      eventContract.system_producer?.name +
      ' - ' +
      eventContract.system_producer?.description,
    );
    mailTemplate = mailTemplate.replace(
      '@then',
      eventContract.action.identifier +
      ' - ' +
      eventContract.action.description,
    );
    mailTemplate = mailTemplate.replace(
      '@inThen',
      eventContract.system_consumer?.name +
      ' - ' +
      eventContract.system_consumer?.description,
    );
    //event
    mailTemplate = mailTemplate.replace('@eventLogIdentifier', receivedEventId);
    mailTemplate = mailTemplate.replace('@timestampEvent', date);
    let urlWithSensitiveValues = stringObfuscate(rawSensibleParams, parsedReq.url);
    mailTemplate = mailTemplate.replace('@urlEvent', urlWithSensitiveValues);
    
    let bodyWithSensibleParms = this.getObfuscateData(parsedBody, rawSensibleParams);
    mailTemplate = mailTemplate.replace('@bodyEvent', JSON.stringify(bodyWithSensibleParms));
    let headersWithSensitiveValues = objectObfuscate(rawSensibleParams, parsedReq.headers)
    mailTemplate = mailTemplate.replace('@headersEvent', JSON.stringify(headersWithSensitiveValues));
    //subscriber
    mailTemplate = mailTemplate.replace('@timestampSubscriber', date);
    let urlSubscriberWithSensitiveValues = stringObfuscate(rawSensibleParams, error?.response?.request?.res?.responseUrl ?? jsonAxiosBaseConfigUrl);
    mailTemplate = mailTemplate.replace('@urlSubscriber', urlSubscriberWithSensitiveValues);
    mailTemplate = mailTemplate.replace(
      '@httpStatusSubscriber',
      error.response?.status ?? 500,
    );
    let bodySubscriberWithSensibleParms = this.getObfuscateData(error.response?.data, rawSensibleParams);
    mailTemplate = mailTemplate.replace(
      '@bodySubscriber',
      JSON.stringify(bodySubscriberWithSensibleParms),
    );
    let headersSubscriberWithSensitiveValues = objectObfuscate(rawSensibleParams, error.response?.headers)

    mailTemplate = mailTemplate.replace(
      '@headersSubscriber',
      JSON.stringify(headersSubscriberWithSensitiveValues ?? {}),
    );
    return mailTemplate; */

    mailTemplate = mailTemplate.replace('@contract', eventContractContractIdentifier);
    mailTemplate = mailTemplate.replace(
      '@when',
      eventContractEventIdentifier +
      ' - ' +
      eventContractEventDescription,
    );
    mailTemplate = mailTemplate.replace(
      '@inWhen',
      eventContractSystemProducerName +
      ' - ' +
      eventContractSystemProducerDescription,
    );
    mailTemplate = mailTemplate.replace(
      '@then',
      eventContractActionIdentifier +
      ' - ' +
      eventContractActionDescription,
    );
    mailTemplate = mailTemplate.replace(
      '@inThen',
      eventContractSystemConsumerName +
      ' - ' +
      eventContractSystemConsumerDescription,
    );
    //event
    mailTemplate = mailTemplate.replace('@eventLogIdentifier', receivedEventId);
    mailTemplate = mailTemplate.replace('@timestampEvent', date);
    let urlWithSensitiveValues = stringObfuscate(rawSensibleParams, parsedReqUrl);
    mailTemplate = mailTemplate.replace('@urlEvent', urlWithSensitiveValues);
    
    let bodyWithSensibleParms = this.getObfuscateData(parsedBody, rawSensibleParams);
    mailTemplate = mailTemplate.replace('@bodyEvent', JSON.stringify(bodyWithSensibleParms));
    let headersWithSensitiveValues = objectObfuscate(rawSensibleParams, parsedReqHeaders)
    mailTemplate = mailTemplate.replace('@headersEvent', JSON.stringify(headersWithSensitiveValues));
    //subscriber
    mailTemplate = mailTemplate.replace('@timestampSubscriber', date);
    let urlSubscriberWithSensitiveValues = stringObfuscate(rawSensibleParams, errorResponseRequestResponseUrl);
    mailTemplate = mailTemplate.replace('@urlSubscriber', urlSubscriberWithSensitiveValues);
    mailTemplate = mailTemplate.replace(
      '@httpStatusSubscriber',
      errorResponseStatus,
    );
    let bodySubscriberWithSensibleParms = this.getObfuscateData(errorResponseData, rawSensibleParams);
    mailTemplate = mailTemplate.replace(
      '@bodySubscriber',
      JSON.stringify(bodySubscriberWithSensibleParms),
    );
    let headersSubscriberWithSensitiveValues = objectObfuscate(rawSensibleParams, errorResponseHeaders)

    mailTemplate = mailTemplate.replace(
      '@headersSubscriber',
      JSON.stringify(headersSubscriberWithSensitiveValues ?? {}),
    );
    return mailTemplate;
  };

  protected getObfuscateData = (data: string | object, rawSensibleParams: string) => {
    if (typeof data === "string") {
      return stringObfuscate(rawSensibleParams, data);
    }else if (typeof data === "object") {
      return objectObfuscate(rawSensibleParams, data);
    }
  }
}

export default MailService;