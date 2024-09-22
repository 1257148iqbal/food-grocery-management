const pagination = async ({
    page,
    pageSize = 20,
    model,
    condition,
    pagingRange = 5,
}) => {
    let { offset, limit, pageNumber } = getPaginationOffset(page, pageSize);

    const total = await model.countDocuments(condition);

    const { totalPage, hasNextPage, hasPreviousPage, pageInfo } =
        doPagingPreData(total, limit, pageNumber);

    const paging = await doPaging(
        pageNumber,
        pagingRange,
        totalPage,
        pageNumber - 1 * limit
    );

    return {
        limit,
        total,
        offset,
        metadata: {
            hasNextPage,
            hasPreviousPage,
            list: {
                total,
                limit,
            },
            page: pageInfo,
            paging,
        },
    };
};

const paginationWithLocation = async ({
    page,
    pageSize = 20,
    model,
    condition,
    pagingRange = 5,
}) => {
    let { offset, limit, pageNumber } = getPaginationOffset(page, pageSize);

    const total = await model.count(condition);

    const { totalPage, hasNextPage, hasPreviousPage, pageInfo } =
        doPagingPreData(total, limit, pageNumber);

    const paging = await doPaging(
        pageNumber,
        pagingRange,
        totalPage,
        pageNumber - 1 * limit
    );

    return {
        limit,
        total,
        offset,
        metadata: {
            hasNextPage,
            hasPreviousPage,
            list: {
                total,
                limit,
            },
            page: pageInfo,
            paging,
        },
    };
};

const paginationMultipleModel = async ({
    page,
    pageSize = 20,
    total,
    pagingRange = 5,
}) => {
    let { offset, limit, pageNumber } = getPaginationOffset(page, pageSize);

    const { totalPage, hasNextPage, hasPreviousPage, pageInfo } =
        doPagingPreData(total, limit, pageNumber);

    const paging = await doPaging(
        pageNumber,
        pagingRange,
        totalPage,
        pageNumber - 1 * limit
    );

    return {
        limit,
        total,
        offset,
        metadata: {
            hasNextPage,
            hasPreviousPage,
            list: {
                total,
                limit,
            },
            page: pageInfo,
            paging,
        },
    };
};

const getPaginationOffset = (page, pageSize) => {
    let limit = parseInt(pageSize);
    let pageNumber = parseInt(page);
    pageNumber === 0 ? (pageNumber = 1) : null;
    const offset = parseInt((pageNumber - 1) * parseInt(limit));
    return { offset, limit, pageNumber };
};

const doPagingPreData = (total, limit, pageNumber) => {
    let totalPage = Math.ceil(total / limit);

    var hasNextPage = true;
    let nextPage = pageNumber + 1;
    var hasPreviousPage = false;
    let previousPage = pageNumber - 1;

    if (nextPage > totalPage) {
        hasNextPage = false;
    }

    if (pageNumber > 1) {
        hasPreviousPage = true;
    } else {
        hasPreviousPage = false;
    }

    const pageInfo = {
        totalPage,
        currentPage: pageNumber,
        nextPage: hasNextPage ? nextPage : null,
        previousPage: hasPreviousPage ? previousPage : null,
    };

    return {
        totalPage,
        hasNextPage,
        hasPreviousPage,
        pageInfo,
    };
};

const doPaging = async (currentPage, range, totalPages, start = 1) => {
    let paging = [];

    range > totalPages ? (range = totalPages) : null;

    if (currentPage < range / 2 + 1) {
        start = 1;
    } else if (currentPage >= totalPages - range / 2) {
        start = Math.floor(totalPages - range + 1);
    } else {
        start = currentPage - Math.floor(range / 2);
    }

    for (let i = start; i <= start + range - 1; i++) {
        if (i == currentPage) {
            // paging.push(`[${i}]`); // add brackets to indicate current page
            paging.push({
                active: true,
                page: i,
            });
        } else {
            // paging.push(i.toString());
            paging.push({
                active: false,
                page: i,
            });
        }
    }
    return paging.length > 1 ? paging : [];
};

// function jsPagination(model,page,limit) {
//     // middleware function

//       // calculating the starting and ending index
//       const startIndex = (page - 1) * limit;
//       const endIndex = page * limit;

//       const results = {};
//       if (endIndex < model.length) {
//         results.next = {
//           page: page + 1,
//           limit: limit
//         };
//       }

//       if (startIndex > 0) {
//         results.previous = {
//           page: page - 1,
//           limit: limit
//         };
//       }

//       results.results = model.slice(startIndex, endIndex);
//     //   res.paginatedResults = results;
//     //   next();
//     return results
//   }

const basicPaginate = (items, page = 1, perPage = 10) => {
    const offset = perPage * (page - 1);
    const totalPages = Math.ceil(items.length / perPage);
    const paginatedItems = items.slice(offset, perPage * page);

    return {
        items: paginatedItems,
        paginate: {
            previousPage: page - 1 ? true : false,
            nextPage: totalPages > page ? true : false,
            total: items.length,
            totalPages,
        },
    };
};

module.exports = {
    pagination,
    paginationWithLocation,
    paginationMultipleModel,
    getPaginationOffset,
    doPagingPreData,
    doPaging,
    basicPaginate,
};
