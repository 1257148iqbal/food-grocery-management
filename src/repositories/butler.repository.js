const Repository = require('../helpers/repository');
const ButlerModel = require('../models/ButlerModel');

class ButlerRepository extends Repository {
    constructor() {
        super(ButlerModel);
    }
}

const butlerRepository = new ButlerRepository();
module.exports = { butlerRepository };
