const express = require('express');
const app = express();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

app.use(express.static("dist"));
app.use(express.json());

//const PORT = process.env.PORT || 4242;


app.post("/create-account-session", async (req, res) => {
  console.log("Received request to create-account-session");
  try {
    const account = await stripe.accounts.create({
      type: 'standard',
      country: 'US',
      business_type: 'individual',
    });
    console.log("Created Stripe account:", account.id);

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://myunipop.com/refresh',
      return_url: 'https://myunipop.com/return',
      type: 'account_onboarding', 

    });
    console.log("Created account link:", accountLink.url);

    const response = { 
      url: accountLink.url,
      accountId: account.id
    };
    console.log("Sending response:", response);
    res.json(response);
  } catch (error) {
    console.error("Error creating Stripe account session:", error);
    res.status(500).json({ error: error.message });
  }
});



app.post('/check-account-status', async (req, res) => {
  const { connectedAccountId } = req.body;

  if (!connectedAccountId) {
    return res.status(400).json({ error: 'Connected account ID is required' });
  }

  try {
    const account = await stripe.accounts.retrieve(connectedAccountId);

    const status = {
      isFullyVerified: account.details_submitted && account.charges_enabled && account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements
    };

    res.json(status);
  } catch (error) {
    console.error('Error retrieving Stripe account status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/get-dashboard-link', async (req, res) => {
  const { connectedAccountId } = req.body;

  if (!connectedAccountId) {
    return res.status(400).json({ error: 'Connected account ID is required' });
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: connectedAccountId,
      refresh_url: 'https://myunipop.com/refresh', // Replace with your actual refresh URL
      return_url: 'https://myunipop.com/return',   // Replace with your actual return URL
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe account link:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/verify-stripe-connection', async (req, res) => {
  const { accountId } = req.body;

  try {
    const account = await stripe.accounts.retrieve(accountId);
    const isConnected = account.details_submitted && account.charges_enabled && account.payouts_enabled;
    res.json({ isConnected });
  } catch (error) {
    console.error('Error verifying Stripe connection:', error);
    res.status(500).json({ error: 'Failed to verify Stripe connection' });
  }
});

app.post('/onboard-user', async (req, res) => {
  try {
    const account = await stripe.accounts.create({
      type: 'standard',
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://myunipop.com/reauth',
      return_url: 'https://myunipop.com/return',
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url, accountId: account.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.post('/create-payment-intent', async (req, res) => {
  try {
    const customer = await stripe.customers.create();
    const ephemeralKey = await stripe.ephemeralKeys.create(
      {customer: customer.id},
      {apiVersion: '2024-04-10'}
    );
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1099,
      currency: 'usd',
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: 123, // The fee you want to collect, in cents
      transfer_data: {
        destination: '{{CONNECTED_ACCOUNT_ID}}', // Replace with the actual connected account ID
      },
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: 'pk_test_51PUJY5CggrV7v76UjLSFjdiVesDtrOW8CSrTpvXHvQ6CCmXTMErq1x2IbRsZiFnFVufbmlXA7AR7QS50e2YcDDa900MMyKxaD6'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/create-payment-intent-for-product', async (req, res) => {
  try {
    const { amount, connectedAccountId } = req.body;

    if (!amount || !connectedAccountId) {
      return res.status(400).json({ error: "Missing amount or connectedAccountId" });
    }

   // const minimumAmount = 50;
  //  const adjustedAmount = Math.max(amount, minimumAmount);

    const customer = await stripe.customers.create();
    const ephemeralKey = await stripe.ephemeralKeys.create(
      {customer: customer.id},
      {apiVersion: '2024-04-10'}
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: Math.max(0, Math.round(amount * 0.1)), // 10% fee, minimum 1 cent
    //  }, {
    //    stripeAccount: '{{CONNECTED_ACCOUNT_ID}}',
  //  });
      transfer_data: {
        destination: connectedAccountId,
      },
    });


    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: 'pk_test_51PUJY5CggrV7v76UjLSFjdiVesDtrOW8CSrTpvXHvQ6CCmXTMErq1x2IbRsZiFnFVufbmlXA7AR7QS50e2YcDDa900MMyKxaD6'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(4242, () => console.log('Node server listening on port 4242!'));

// app.listen(PORT, () => console.log('Node server listening on port 4242!'));
