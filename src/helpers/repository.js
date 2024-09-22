class Repository  {
    constructor(model) {
        this.model =  model;
    }

    getModelName = () => this.model.modelName;

    createOne = (body) => {
        const newData = new this.model(body);
        return newData.save();
    };

    createMultiple =(body) => {
        return this.model.insertMany(body);
    };

    findAllByQuery = ({query = {}, select = {}}) => {
        return this.model.find(query).select(select)
    };
    findTotalByQuery = (query= {}) => {
        return this.model.find(query).count();
    };

    // {
    //     query?: { [key: string]: any },
    //     options?: any,
    //     projection?: any,
    //     reqQuery: { page?: number, limit?: number, sort_by?: string, text?: string } | any,
    //     select?: object
    // }
    findAllByQueryWithPagination = async ({
                                              query = {},
                                              options = {},
                                              reqQuery = {page: 1, limit: 0, sort_by: '',},
                                              select = {},
                                              isLean=true,
                                              populateOptions=[]
                                          }
    ) => {
        delete query.page;
        delete query.limit;
        delete query.sort_by;
        let sortBy = {_id: 1};
        if (reqQuery.sort_by) sortBy = JSON.parse(reqQuery.sort_by);

        let pageNumber= 1, pageSize = process.env.PAGINATE_PAGE_SIZE || 20;
        const {page, limit} = reqQuery;
        if (page && Number(page) > 1) pageNumber = Number(page);
        if (limit && Number(limit) > 0) pageSize = Number(limit);
        if (reqQuery.text) {
            query.$text = {$search: reqQuery.text};
            options.score = {$meta: "textScore"};
            sortBy.score = {$meta: "textScore"}
        }
        if (!Object.values(select).includes(1)) select = {__v: 0, is_deleted: 0, audit_trails: 0, ...select};
        const resData = await this.model.find(query, options).lean(isLean).select(select).skip((pageNumber - 1) * pageSize).limit(pageSize).sort(sortBy).populate(populateOptions);
        const total_count = await this.model.countDocuments(query);
        return {
            metadata: {limit: pageSize, page: pageNumber, total_count},
            data: resData
        };
    };

    findAllByAggregation = async ({pipeline = [], select = {}}) => {
        if (!Object.values(select).includes(1)) select = {__v: 0, is_deleted: 0, audit_trails: 0, ...select};
        if (Object.keys(select).length > 0) pipeline.push({$project: select})
        if (!pipeline[0].$match) pipeline.unshift({$match: {}});
        pipeline[0].$match.is_deleted = false;

        return this.model.aggregate(pipeline);
    };
    findAllByAggregationWithPagination = async ({
                                                    pipeline = [],
                                                    reqQuery = {page: 1, limit: 0, sort_by: '',},
                                                    select = {}
                                                }
    ) => {
        let sortBy = {_id: 1};
        if (reqQuery.sort_by) sortBy = JSON.parse(reqQuery.sort_by);

        let pageNumber = 1, pageSize = process.env.PAGINATE_PAGE_SIZE || 20;
        const {page, limit} = reqQuery;
        if (page && Number(page) > 1) pageNumber = Number(page);
        if (limit && Number(limit) > 0) pageSize = Number(limit);

        if (!pipeline[0].$match) pipeline.unshift({$match: {}});
        pipeline[0].$match.is_deleted = false;
        if (reqQuery.text) {
            pipeline[0].$match.$text = {$search: reqQuery.text};
            sortBy.score = {$meta: "textScore"}
        }
        if (Object.keys(sortBy).length > 0) pipeline.push({$sort: sortBy})
        if (!Object.values(select).includes(1)) select = {__v: 0, is_deleted: 0, audit_trails: 0, ...select};
        pipeline.push({
            $facet: {
                paginatedResults: [{$project: select}, {$skip: (pageNumber - 1) * pageSize}, {$limit: pageSize}],
                totalCount: [{$count: 'count'}]
            }
        })
        const resData = await this.model.aggregate(pipeline);
        return {
            metadata: {limit: pageSize, page: pageNumber, total_count: resData[0]?.totalCount[0]?.count ?? 0},
            data: resData[0]?.paginatedResults ?? []
        };
    };

}

module.exports = Repository;
