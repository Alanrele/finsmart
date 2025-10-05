const { Client } = require('@microsoft/microsoft-graph-client');
const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');

class GraphService {
  // Custom authentication provider
  static createAuthProvider(accessToken) {
    return {
      getAccessToken: async () => accessToken
    };
  }

  // Create Graph client with access token
  static getClient(accessToken) {
    const authProvider = this.createAuthProvider(accessToken);
    return Client.initWithMiddleware({ authProvider });
  }

  // Get user profile
  static async getUserProfile(accessToken) {
    try {
      const client = this.getClient(accessToken);
      const profile = await client.api('/me').get();

      return {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.mail || profile.userPrincipalName,
        firstName: profile.givenName,
        lastName: profile.surname,
        jobTitle: profile.jobTitle,
        officeLocation: profile.officeLocation
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  // Get emails from specific sender
  static async getEmailsFromSender(accessToken, senderEmail, options = {}) {
    try {
      const client = this.getClient(accessToken);

      const {
        top = 50,
        select = 'id,subject,body,receivedDateTime,from,hasAttachments',
        orderBy = 'receivedDateTime desc'
      } = options;

      const filter = `from/emailAddress/address eq '${senderEmail}'`;

      const response = await client
        .api('/me/messages')
        .filter(filter)
        .select(select)
        .orderby(orderBy)
        .top(top)
        .get();

      return response.value;
    } catch (error) {
      console.error('Get emails error:', error);
      throw new Error(`Failed to get emails: ${error.message}`);
    }
  }

  // Get email attachments
  static async getEmailAttachments(accessToken, messageId) {
    try {
      const client = this.getClient(accessToken);

      const response = await client
        .api(`/me/messages/${messageId}/attachments`)
        .get();

      return response.value;
    } catch (error) {
      console.error('Get attachments error:', error);
      throw new Error(`Failed to get attachments: ${error.message}`);
    }
  }

  // Get mail folders
  static async getMailFolders(accessToken) {
    try {
      const client = this.getClient(accessToken);

      const response = await client
        .api('/me/mailFolders')
        .get();

      return response.value.map(folder => ({
        id: folder.id,
        displayName: folder.displayName,
        totalItemCount: folder.totalItemCount,
        unreadItemCount: folder.unreadItemCount,
        parentFolderId: folder.parentFolderId
      }));
    } catch (error) {
      console.error('Get mail folders error:', error);
      throw new Error(`Failed to get mail folders: ${error.message}`);
    }
  }

  // Search emails
  static async searchEmails(accessToken, query, options = {}) {
    try {
      const client = this.getClient(accessToken);

      const {
        top = 25,
        select = 'id,subject,body,receivedDateTime,from,hasAttachments'
      } = options;

      const response = await client
        .api('/me/messages')
        .search(query)
        .select(select)
        .top(top)
        .get();

      return response.value;
    } catch (error) {
      console.error('Search emails error:', error);
      throw new Error(`Failed to search emails: ${error.message}`);
    }
  }

  // Get email by ID
  static async getEmailById(accessToken, messageId) {
    try {
      const client = this.getClient(accessToken);

      const response = await client
        .api(`/me/messages/${messageId}`)
        .get();

      return response;
    } catch (error) {
      console.error('Get email by ID error:', error);
      throw new Error(`Failed to get email: ${error.message}`);
    }
  }

  // Create webhook subscription
  static async createWebhookSubscription(accessToken, notificationUrl, resource = '/me/messages') {
    try {
      const client = this.getClient(accessToken);

      const subscription = {
        changeType: 'created',
        notificationUrl: notificationUrl,
        resource: resource,
        expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        clientState: 'finsmart-' + Math.random().toString(36).substring(7)
      };

      const response = await client
        .api('/subscriptions')
        .post(subscription);

      return response;
    } catch (error) {
      console.error('Create webhook subscription error:', error);
      throw new Error(`Failed to create webhook subscription: ${error.message}`);
    }
  }

  // Renew webhook subscription
  static async renewWebhookSubscription(accessToken, subscriptionId) {
    try {
      const client = this.getClient(accessToken);

      const update = {
        expirationDateTime: new Date(Date.now() + 3600000).toISOString() // 1 hour
      };

      const response = await client
        .api(`/subscriptions/${subscriptionId}`)
        .patch(update);

      return response;
    } catch (error) {
      console.error('Renew webhook subscription error:', error);
      throw new Error(`Failed to renew webhook subscription: ${error.message}`);
    }
  }

  // Delete webhook subscription
  static async deleteWebhookSubscription(accessToken, subscriptionId) {
    try {
      const client = this.getClient(accessToken);

      await client
        .api(`/subscriptions/${subscriptionId}`)
        .delete();

      return { message: 'Subscription deleted successfully' };
    } catch (error) {
      console.error('Delete webhook subscription error:', error);
      throw new Error(`Failed to delete webhook subscription: ${error.message}`);
    }
  }

  // Validate token
  static async validateToken(accessToken) {
    try {
      const client = this.getClient(accessToken);
      await client.api('/me').get();
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Get email content as text
  static getEmailContentAsText(email) {
    if (!email.body) return '';

    let content = email.body.content || '';

    // Remove HTML tags if content type is HTML
    if (email.body.contentType === 'html') {
      content = content.replace(/<[^>]*>/g, ' ');
      content = content.replace(/&nbsp;/g, ' ');
      content = content.replace(/&amp;/g, '&');
      content = content.replace(/&lt;/g, '<');
      content = content.replace(/&gt;/g, '>');
      content = content.replace(/&quot;/g, '"');
    }

    // Clean up extra whitespace
    content = content.replace(/\s+/g, ' ').trim();

    return content;
  }

  // Extract BCP notification data patterns
  static extractBCPPatterns(emailContent) {
    const patterns = {
      amount: /S\/\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      date: /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      time: /(\d{1,2}:\d{2}(?::\d{2})?)/g,
      operation: /(?:Operación|Operacion|Transacción|Transaccion|N°|No\.)\s*:?\s*(\d+)/gi,
      card: /(?:Tarjeta|Card).*?(\d{4})/gi,
      merchant: /(?:en|at|comercio|establecimiento)\s+([A-Z\s]+?)(?:\s+el|\s+\d|$)/gi
    };

    const extracted = {};

    // Extract amounts
    const amounts = [];
    let match;
    while ((match = patterns.amount.exec(emailContent)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, '')));
    }
    if (amounts.length > 0) {
      extracted.amounts = amounts;
    }

    // Extract dates
    const dates = [];
    while ((match = patterns.date.exec(emailContent)) !== null) {
      dates.push(match[1]);
    }
    if (dates.length > 0) {
      extracted.dates = dates;
    }

    // Extract operation numbers
    const operations = [];
    while ((match = patterns.operation.exec(emailContent)) !== null) {
      operations.push(match[1]);
    }
    if (operations.length > 0) {
      extracted.operations = operations;
    }

    // Extract card numbers
    const cards = [];
    while ((match = patterns.card.exec(emailContent)) !== null) {
      cards.push(match[1]);
    }
    if (cards.length > 0) {
      extracted.cards = cards;
    }

    // Extract merchants
    const merchants = [];
    while ((match = patterns.merchant.exec(emailContent)) !== null) {
      merchants.push(match[1].trim());
    }
    if (merchants.length > 0) {
      extracted.merchants = merchants;
    }

    return extracted;
  }
}

module.exports = GraphService;
