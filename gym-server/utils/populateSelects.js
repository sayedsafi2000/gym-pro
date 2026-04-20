// Centralized populate select strings. Import instead of duplicating the
// field list at every call site — keeps payload shape consistent and makes
// adding/removing fields a single-point change.

const PACKAGE_FULL = 'name duration priceGents priceLadies admissionFee includesAdmission freeMonths description benefits category isLifetime';
const PACKAGE_SUMMARY = 'name duration priceGents priceLadies';
const PACKAGE_RECEIPT = 'name duration priceGents priceLadies admissionFee includesAdmission description benefits isLifetime freeMonths';
const PACKAGE_PRICING = 'priceGents priceLadies admissionFee includesAdmission';

module.exports = {
  PACKAGE_FULL,
  PACKAGE_SUMMARY,
  PACKAGE_RECEIPT,
  PACKAGE_PRICING,
};
