import express, { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const CUSTOM_WEBHOOK_SECRET = process.env.CUSTOM_WEBHOOK_SECRET;
const GOOGLE_CHAT_SPACE_ID = process.env.GOOGLE_CHAT_SPACE_ID;
const GOOGLE_CHAT_WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL;

// interface WebhookPayload {
//   secret: string;
//   repository: string;
//   organization: string;
//   ref: string;
//   commits: Array<{
//     id: string;
//     author: string;
//     message: string;
//   }>;
// }

interface Commit {
  id: string;
  author: {
    name: string;
  };
  message: string;
  added: string[];
  removed: string[];
  modified: string[];
}

interface WebhookPayload {
  commits?: Commit[];
  repository: {
    name: string;
  };
  organization?: {
    login: string;
  };
  ref: string;
}


//should replace this url with the chat url
app.post('https://myra-reports-be.onrender.com/api/v1/gitWebHook', async (req: Request, res: Response) => {
  const payload = req.body as WebhookPayload;
  console.log(req.body);
  if (payload.commits && payload.commits.length > 0) {
    const repository = payload.repository.name;
    const organization = payload.organization ? payload.organization.login : 'N/A';
    const branch = payload.ref.split('/').pop() || '';
    const commits = payload.commits;
    let message = `New push to ${organization}/${repository} on branch ${branch}:\n\n`;
    for (const commit of commits) {
      message += `Commit: ${commit.id.substring(0, 7)}\n`;
      message += `Author: ${commit.author.name}\n`;
      message += `Message: ${commit.message}\n`;
      message += `Changes: +${commit.added.length} -${commit.removed.length} ~${commit.modified.length}\n\n`;
    }
    try {
      await sendToGmailChat(message);
      res.status(200).send('Message sent to Gmail chat');
    } catch (error) {
      console.error('Error sending message to Gmail chat:', error);
      res.status(500).send('Error sending message to Gmail chat');
    }
  } else {
    res.status(200).send('Received non-push event, no action taken');
  }
});

const TARGET_URL = 'https://myra-reports-be.onrender.com/api/v1/gitWebHook';
   
   app.post('/webhook', async (req, res) => {
     try {
      console.log('req.body - ',req.body);
       const response = await axios.post(TARGET_URL, req.body, {
         headers: {
           'Content-Type': 'application/json',
           'X-GitHub-Event': req.headers['x-github-event'],
           'X-Hub-Signature-256': req.headers['x-hub-signature-256'],
           'X-GitHub-Delivery': req.headers['x-github-delivery']
         }
       });
       console.log('Webhook forwarded:', response.data);
       res.status(response.status).send(response.data);
      
     } catch (error) {
       console.error('Error forwarding webhook:', error);
       res.status(500).send('Error forwarding webhook');
     }
   });
   

async function sendToGmailChat(message: string): Promise<void> {
  if (!GOOGLE_CHAT_SPACE_ID || !GOOGLE_CHAT_WEBHOOK_URL) {
    throw new Error('GOOGLE_CHAT_SPACE_ID or GOOGLE_CHAT_WEBHOOK_URL is not set');
  }
  const url = `${GOOGLE_CHAT_WEBHOOK_URL}`;
  console.log('url - ',url);
  const response = await axios.post(url, { text: message });
  console.log('Message sent:', response.data);
}
console.log('GOOGLE_CHAT_SPACE_ID - ',GOOGLE_CHAT_SPACE_ID);
console.log('GOOGLE_CHAT_WEBHOOK_URL - ',GOOGLE_CHAT_WEBHOOK_URL);
  if (!GOOGLE_CHAT_WEBHOOK_URL || !GOOGLE_CHAT_SPACE_ID) {
    throw new Error('Google Chat configuration is incomplete');
  }

  // const url = `${GOOGLE_CHAT_WEBHOOK_URL}${GOOGLE_CHAT_SPACE_ID}`;
  // console.log(url);

  // try {
  //   const response = await axios.post(url, { text: message });
  //   console.log('Message sent to Google Chat');
  // } catch (error) {
  //   if (axios.isAxiosError(error)) {
  //     const axiosError = error as AxiosError;
  //     throw new Error(`Failed to send message to Google Chat: ${axiosError.message}`);
  //   } else {
  //     throw new Error('An unexpected error occurred while sending message to Google Chat');
  //   }
  // }


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (err: Error) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Global error handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});