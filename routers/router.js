const {Router} = require('express');

/** Get a blank router object

  {}

  @returns
  <Router Object>
*/
module.exports = ({}) => {
  return Router({caseSensitive: true, strict: true});
};

