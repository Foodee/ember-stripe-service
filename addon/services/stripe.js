/* global Stripe */
import { isEqual, typeOf } from "@ember/utils";
import { assert } from "@ember/debug";

import { resolve, Promise as EmberPromise } from "rsvp";
import { registerWaiter } from "@ember/test";
import Service from "@ember/service";
import loadScript from "ember-stripe-service-foodee/utils/load-script";

export default Service.extend({
  didConfigure: false,
  config: null,

  lazyLoad: null,
  mock: null,
  publishableKey: null,
  debuggingEnabled: null,

  runCount: 0,

  init() {
    this._super(...arguments);
    assert(
      this.config,
      "StripeService: Missing Stripe key, please set `ENV.stripe.publishableKey` in config.environment.js and override the constructor for this service"
    );

    this.lazyLoad = this.config.lazyLoad;
    this.mock = this.config.mock;
    this.publishableKey = this.config.publishableKey;
    this.debuggingEnabled = this.config.debuggingEnabled;

    let lazyLoad = this.get("lazyLoad");
    let mock = this.get("mock");

    if (this.config.testing) {
      this._waiter = () => {
        return this.get("runCount") === 0;
      };
      registerWaiter(this._waiter);
    }

    if (!lazyLoad || mock) {
      this.configure();
    }
  },

  load() {
    let lazyLoad = this.get("lazyLoad");
    let mock = this.get("mock");

    let loadJs =
      lazyLoad && !mock ? loadScript("https://js.stripe.com/v2/") : resolve();

    return loadJs.then(() => {
      this.configure();
    });
  },

  configure() {
    let didConfigure = this.get("didConfigure");

    if (!didConfigure) {
      let publishableKey = this.get("publishableKey");
      Stripe.setPublishableKey(publishableKey);

      this.card = {
        createToken: this._createCardToken.bind(this),
      };

      this.bankAccount = {
        createToken: this._createBankAccountToken.bind(this),
      };

      this.piiData = {
        createToken: this._createPiiDataToken.bind(this),
      };

      this._checkForAndAddCardFn("cardType", Stripe.card.cardType);
      this._checkForAndAddCardFn(
        "validateCardNumber",
        Stripe.card.validateCardNumber
      );
      this._checkForAndAddCardFn("validateCVC", Stripe.card.validateCVC);
      this._checkForAndAddCardFn("validateExpiry", Stripe.card.validateExpiry);

      this.set("didConfigure", true);
    }
  },

  stripePromise(callback) {
    return this.load().then(() => {
      return new EmberPromise((resolve, reject) => {
        callback(resolve, reject);
      });
    });
  },

  /**
   * Creates a creditCard token using Stripe.js API, exposed as `card.createToken`
   * @param  {object} card  CreditCard
   * @return {promise}      Returns a promise that holds response, see stripe.js docs for details
   *                        status is not being returned at the moment but it can be logged
   */
  _createCardToken(card) {
    this.debug("card.createToken:", card);
    this.incrementProperty("runCount");

    return this.stripePromise((resolve, reject) => {
      Stripe.card.createToken(card, (status, response) => {
        this.debug(
          "card.createToken handler - status %s, response:",
          status,
          response
        );

        if (response.error) {
          reject(response);
        } else {
          resolve(response);
        }

        this.decrementProperty("runCount");
      });
    });
  },

  /**
   * Creates a BankAccout token using Stripe.js API, exposed as `bankAccount.createToken`
   * @param  {object} bankAccount
   * @return {promise}      Returns a promise that holds response, see stripe.js docs for details
   *                        Status is not being returned at the moment but it can be logged
   *
   */
  _createBankAccountToken(bankAccount) {
    this.debug("bankAccount.createToken:", bankAccount);
    this.incrementProperty("runCount");

    return this.stripePromise((resolve, reject) => {
      Stripe.bankAccount.createToken(bankAccount, (status, response) => {
        this.debug(
          "bankAccount.createToken handler - status %s, response:",
          status,
          response
        );

        if (response.error) {
          reject(response);
        } else {
          resolve(response);
        }

        this.decrementProperty("runCount");
      });
    });
  },

  /**
   * Creates a piiData token using Stripe.js API, exposed as `piiData.createToken`
   * @param  {object} piiData  PiiData
   * @return {promise}         Returns a promise that holds response, see stripe.js docs for details
   *                           status is not being returned at the moment but it can be logged
   */
  _createPiiDataToken(piiData) {
    this.debug("piiData.createToken:", piiData);
    this.incrementProperty("runCount");

    return this.stripePromise((resolve, reject) => {
      Stripe.piiData.createToken(piiData, (status, response) => {
        this.debug(
          "piiData.createToken handler - status %s, response:",
          status,
          response
        );

        if (response.error) {
          reject(response);
        } else {
          resolve(response);
        }

        this.decrementProperty("runCount");
      });
    });
  },

  /**
   * Uses Ember.Logger.info to output service information if debugging is
   * set
   *
   * notes:
   * - proxies all arguments to Ember.Logger.info
   * - pre-pends StripeService to all messages
   */
  debug() {
    let debuggingEnabled = this.get("debuggingEnabled");

    if (debuggingEnabled) {
      let args = Array.prototype.slice.call(arguments);
      args[0] = `StripeService: ${args[0]}`;
      console.info.apply(null, args);
    }
  },

  _checkForAndAddCardFn(name, fn) {
    if (isEqual(typeOf(Stripe.card[name]), "function")) {
      this.card[name] = fn;
    } else {
      this.card[name] = function () {};
      console.error(
        `ember-cli-stripe: ${name} on Stripe.card is no longer available`
      );
    }
  },
});
