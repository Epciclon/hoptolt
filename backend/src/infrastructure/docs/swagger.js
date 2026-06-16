const swaggerUi = require('swagger-ui-express');
const SwaggerAutoGenerator = require('./swaggerGenerator');

const swaggerConfig = (app) => {
    const generator = new SwaggerAutoGenerator();
    const swaggerSpec = generator.scanRoutes();

    app.use('/swagger', swaggerUi.serve);
    app.get('/swagger', swaggerUi.setup(swaggerSpec));

    app.get('/swagger.json', (req, res) => {
        res.json(swaggerSpec);
    });
};

module.exports = swaggerConfig;
