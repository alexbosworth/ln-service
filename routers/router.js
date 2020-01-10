const bodyParser = require('body-parser');
const {Router} = require('express');

/** Get a blank router object

  {}

  @returns
  <Router Object>
*/
module.exports = ({}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.use(bodyParser.json());

  return router;
};
