/**
 * Created by masatomix on 2017/05/12.
 */

const log4js = require('log4js');
log4js.configure('log4js.json');

const logger = exports = module.exports = {};

logger.main = log4js.getLogger('main');
