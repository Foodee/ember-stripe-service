import StripeMock from 'ember-stripe-service-foodee/utils/stripe-mock';
import config from '../config/environment';

export function initialize() {
  const application = arguments[1] || arguments[0];
  let stripeConfig = config.stripe || {};

  stripeConfig.debug = stripeConfig.debug || config.LOG_STRIPE_SERVICE;

  if (stripeConfig.debug) {
    /* eslint-disable no-console */
    console.log('StripeService: initialize');
  }

  if (typeof FastBoot !== 'undefined' || stripeConfig.mock) {
    window.Stripe = StripeMock;
  }
}

export default {
  name: 'ember-stripe-stripe',
  initialize: initialize
};
