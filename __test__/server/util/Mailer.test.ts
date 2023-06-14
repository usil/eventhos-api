// const MailService = require("../../../src/server/util/Mailer");
const {default: MailService} = require( '../../../src/server/util/Mailer');
const nodemailer = require('nodemailer');
const path = require("path");
const { v4 } = require("uuid");
const SMTPTester = require("smtp-tester");


describe('Mailer test', () => {
    let mailService: any;
    let commonSmtpParams = {
        host: "l.l"
    }
    beforeAll( async () => {
     mailService = new MailService();
    })

    test('should return undefined if the transporter variable is diferent to undefined when try call initialize function', async () => {
        mailService.transporter = "new value";
        const resp = await mailService.initialize(commonSmtpParams);
        expect(resp).toBe(undefined);
    });
    test('should return undefined if the params is null or undefined when try call sendMail function', async () => {
        const resp = await mailService.sendMail(undefined)
        expect(resp).toBe(undefined);

        const resp2 = await mailService.sendMail(null)
        expect(resp2).toBe(undefined);
    });

    test('should return undefined if smtpParams.to is undefined when try call sendMail function', async () => {
        const customMailService = new MailService()
        const smtpParams: any = {
            to: undefined,
            smtpHost: null,
            smtpPort: null,
            smtpUser: null,
            smtpPassword: null,
            smtpTlsCiphers: null,
            smtpRecipients: undefined,
        }
        const resp = await customMailService.sendMail(smtpParams);
        expect(resp).toBe(undefined);
    });
    test('should return undefined if smtpParams.subject is undefined when try call sendMail function', async () => {
        const customMailService = new MailService()
        const smtpParams: any = {
            to: null,
            subject: undefined,
            smtpHost: null,
            smtpPort: null,
            smtpUser: null,
            smtpPassword: null,
            smtpTlsCiphers: null,
            smtpRecipients: undefined,
        }
        const resp = await customMailService.sendMail(smtpParams);
        expect(resp).toBe(undefined);
    });
    test('should return undefined if smtpParams.html is undefined when try call sendMail function', async () => {
        const customMailService = new MailService()
        const smtpParams: any = {
            to: null,
            subject: null,
            smtpHost: null,
            smtpPort: null,
            smtpUser: null,
            smtpPassword: null,
            smtpTlsCiphers: null,
            smtpRecipients: null,
            html: undefined,
        }
        const resp = await customMailService.sendMail(smtpParams);
        expect(resp).toBe(undefined);
    });

    test('should reach the message on the smtp server', async () => {
        let smtpEmailResponse: any;
        const customMailService = new MailService()

        const port = 4025;
        const smtpTester    = SMTPTester.init(port);
        const sender = 'foo@random123.com';
        const recipient = 'acme231@mail.com';
        const subject   = 'email test';
        const body      = 'This is a test email';
        function handler(address: string, id:number, email: string) {
            expect(address).toBe(recipient)
            smtpEmailResponse = email;
            smtpTester.unbind(recipient, handler);
            smtpTester.removeAll();
            smtpTester.stop();
        }
        smtpTester.bind(recipient, handler);
        const smtpParams = {
            to: recipient,
            subject: subject,
            html: body,
            smtpHost: "",
            smtpSecure: "",
            smtpPort: port,
            smtpUser: sender,
            smtpPassword: "",
            // https://stackoverflow.com/a/58819828
            smtpTlsCiphers: "TLS_AES_128_GCM_SHA256"
        }
        const resp = await customMailService.sendMail(smtpParams);
        expect(sender).toBe(resp.envelope.from);
        expect(sender).toBe(smtpEmailResponse?.sender);
        expect(smtpEmailResponse?.headers['message-id']).toBe(resp.messageId);
        expect(smtpEmailResponse?.headers.subject).toBe(subject);
        expect(smtpEmailResponse?.html).toBe(body);
    })
});