# API Documentation v2 | Printful (2.0.0-beta)

Download OpenAPI specification:[Download](blob:https://developers.printful.com/cc0b66a1-eb80-4aaa-94ac-5ccd0982a03b)

URL: <https://developers.printful.com/docs/#tag/Other-resources/Developer-support>

# [](https://developers.printful.com/docs/v2-beta/#section/About-the-Printful-API)About the Printful API

### Welcome to API v2 BETA

- We're excited to inform you that the new major version of our API just went live, and we want to invite you to participate in the Open Beta test. Please keep in mind that this release is still in BETA, although all presented endpoints can be used in a production environment. Since this is a BETA release, we are keen on adopting any changes to our API (which we encourage you to pass via [this feedback form](https://forms.gle/Yq4t1poQQR8Mwoyt5)). We do not expect to introduce any breaking changes to the current form of endpoints, although the final form of each endpoint might slightly vary from the current version.

- **How to use new endpoints?** Create or use an already created private token for authorization. Unless it's stated otherwise, the v2 version of Printful API may be used like the v1 version. All v2 endpoints use **/v2** prefix and the specifics of each endpoint are explained in a dedicated section.

- **Test and provide feedback:** Explore the new features, experiment with the enhancements, and share your feedback through our dedicated [feedback form](https://forms.gle/Yq4t1poQQR8Mwoyt5).

### What is new in the V2s

- The flexibility of order creation with itemized order building [(read more)](https://developers.printful.com/docs/v2-beta/#tag/Orders-v2).
- Simplifying embroidery orders: auto thread color detection as default, simplified thread colors definition on the layer level.
- New, powerful design creation with multiple design layers support and positioning for order items [(read more)](https://developers.printful.com/docs/v2-beta/#tag/Orders-v2).
- New, more secure Webhooks by enforcing HTTPS, added expiration date, and request signing.
- More flexibility in webhook per event configuration.
- New webhook events -- a new event for catalog price change, and the stock update event is now real-time with a refresh rate every 5 minutes (previously every 24h).
- More information in the Catalog about the products (images, discounted pricing, placement information).
- More flexibility in the catalog (extensive filtering and sorting options, DSR support, pagination).
- More information on the order shipment level -- more precise EDT, departure country, and shipment tracking events.
- Standardization of returned time in API -- standardized format according to ISO 8601, UTC time zone.
- Standardization of returned price formats in API. Prices are displayed as a string with up to 2 decimal points.
- Uniform pagination parameters across all endpoints.
- Performance improvements for all endpoints.

## [](https://developers.printful.com/docs/v2-beta/#section/About-the-Printful-API/Postman-Collection)Postman Collection

You can explore the API using the Postman collection:

[Download Postman Collection](https://developers.printful.com/docs/v2-beta/postman/printful_postman_collection.json)

# [](https://developers.printful.com/docs/v2-beta/#section/Migration-Guide)Migration Guide

## [](https://developers.printful.com/docs/v2-beta/#section/Migration-Guide/How-to-switch-from-V1-to-V2-endpoints)How to switch from V1 to V2 endpoints

- **Update the Base URL:** Ensure your requests use the updated V2 base path. For V2, endpoints include the prefix /v2 ( e.g., <https://api.printful.com/v2/orders>).
- **Authentication:** Both V1 and V2 use private tokens for authorization. Confirm your token is still valid and configured for your store. No major changes are required here.
- **Leverage New Features:** V2 introduces several enhancements, including:
  - Improved order creation flexibility, allowing itemized order building.
  - Simplified embroidery orders with features like auto thread color detection.
  - New webhooks for real-time updates on events like stock changes.
  - Standardized returned time (ISO 8601) and price formats.
- **Handle Pagination and Rate Limiting:** V2 implements uniform pagination parameters and adopts a leaky bucket algorithm for rate limiting. The X-Ratelimit-\* headers indicate usage and reset times. Adjust your application to handle these changes effectively.
- **Test the Endpoints:** Create a separate store to test scenarios in production cautiously. Provide feedback on any anomalies using Printful's feedback form linked in their documentation.
- **Explore Documentation for Changes:** Thoroughly review the updated API reference to understand the specifics of V2 endpoints, parameters, and expected responses. Adjust your code for endpoints where behavior or parameters have changed compared to V1.

================================================================
