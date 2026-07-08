/**
 * Helper para paginación de consultas
 * @param {number} page - Número de página (default: 1)
 * @param {number} limit - Límite de resultados por página (default: 10)
 * @returns {object} Objeto con offset y límite para Sequelize
 */
function getPaginationParams(page = 1, limit = 10) {
    const parsedPage = Number.parseInt(page) || 1;
    const parsedLimit = Number.parseInt(limit) || 10;
    const offset = (parsedPage - 1) * parsedLimit;
    
    return {
        limit: parsedLimit,
        offset,
        page: parsedPage
    };
}

/**
 * Formatea la respuesta de paginación
 * @param {number} page - Número de página actual
 * @param {number} limit - Límite de resultados por página
 * @param {number} total - Total de registros
 * @returns {object} Objeto de paginación
 */
function formatPaginationResponse(page, limit, total) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
    };
}

/**
 * Crea una respuesta paginada
 * @param {Array} data - Datos a retornar
 * @param {number} page - Número de página actual
 * @param {number} limit - Límite de resultados por página
 * @param {number} total - Total de registros
 * @returns {object} Objeto con data y paginación
 */
function createPaginatedResponse(data, page, limit, total) {
    return {
        data,
        pagination: formatPaginationResponse(page, limit, total)
    };
}

module.exports = {
    getPaginationParams,
    formatPaginationResponse,
    createPaginatedResponse
};
