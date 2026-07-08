const fs = require('fs');
const path = require('path');

class SwaggerAutoGenerator {
    constructor() {
        this.routes = [];
        this.basePath = '/api';
        this.models = {};
        this.modelSchemas = {};
    }

    findRouteFiles(dir) {
        const files = [];
        if (!fs.existsSync(dir)) return files;
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                files.push(...this.findRouteFiles(fullPath));
            } else if (item.endsWith('.routes.js')) {
                files.push(fullPath);
            }
        });
        return files;
    }

    scanRoutes(modulesDir = './src/modules', modelsDir = './src/domain/models') {
        const routeFiles = this.findRouteFiles(modulesDir);
        routeFiles.forEach(filePath => {
            this.parseRouteFile(filePath);
        });

        const modelFiles = fs.readdirSync(modelsDir);
        modelFiles.forEach(file => {
            if (file.endsWith('.js') && !file.includes('index')) {
                const modelPath = path.join(modelsDir, file);
                this.parseModelFile(modelPath);
            }
        });

        return this.generateSwaggerSpec();
    }

    parseRouteFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach(line => {
            const routeMatch = line.match(/router\.(get|post|put|delete)\(['"]([^"]+)['"]/);
            if (routeMatch) {
                const [, method, routePath] = routeMatch;
                const fullPath = this.basePath + routePath;
                const routeName = this.extractRouteName(routePath);
                const fileName = path.basename(filePath, '.js');

                this.routes.push({
                    path: fullPath,
                    method: method.toUpperCase(),
                    routeName: routeName,
                    file: fileName
                });
            }
        });
    }

    parseModelFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const baseName = path.basename(filePath, '.js');
        const modelName = baseName.replace('.model', '');

        const modelMatch = content.match(/const (\w+) = sequelize\.define\(['"](\w+)['"],\s*({[\s\S]*?})\s*\);/);
        if (modelMatch) {
            const [, , name, definition] = modelMatch;
            this.models[name] = this.parseModelDefinition(definition, modelName);
            this.modelSchemas[name] = this.generateSchemaFromModel(this.models[name]);
        }
    }

    parseModelDefinition(definition, modelName) {
        const fields = {};

        const fieldMatches = definition.matchAll(/(\w+):\s*{[^}]*type:\s*DataTypes\.(\w+)[\s\S]*?}/g);

        for (const match of fieldMatches) {
            const [, fieldName, dataType] = match;
            fields[fieldName] = {
                type: this.mapDataTypeToSwagger(dataType),
                description: this.generateFieldDescription(fieldName, modelName)
            };

            const fieldSection = match[0];

            const enumMatch = fieldSection.match(/values:\s*\[([^\]]+)\]/);
            if (enumMatch) {
                const enumValues = enumMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
                fields[fieldName].enum = enumValues;
            }

            const minMatch = fieldSection.match(/min:\s*(\d+)/);
            if (minMatch) fields[fieldName].minimum = Number.parseInt(minMatch[1]);

            const maxMatch = fieldSection.match(/max:\s*(\d+)/);
            if (maxMatch) fields[fieldName].maximum = Number.parseInt(maxMatch[1]);

            const allowNullMatch = fieldSection.match(/allowNull:\s*(false|true)/);
            if (allowNullMatch && allowNullMatch[1] === 'false') {
                fields[fieldName].required = true;
            }
        }

        return fields;
    }

    mapDataTypeToSwagger(dataType) {
        const typeMap = {
            'INTEGER': 'integer',
            'STRING': 'string',
            'TEXT': 'string',
            'FLOAT': 'number',
            'DOUBLE': 'number',
            'DECIMAL': 'number',
            'BOOLEAN': 'boolean',
            'DATE': 'string',
            'DATEONLY': 'string',
            'TIME': 'string',
            'JSON': 'object',
            'JSONB': 'object'
        };

        return typeMap[dataType] || 'string';
    }

    generateFieldDescription(fieldName, modelName) {
        const descriptions = {
            'id': `Identificador único de ${modelName}`,
            'name': `Nombre de ${modelName}`,
            'description': `Descripción de ${modelName}`,
            'code': `Código de ${modelName}`,
            'number': `Número de ${modelName}`,
            'type': `Tipo de ${modelName}`,
            'capacity': `Capacidad de ${modelName}`,
            'sex': `Sexo de ${modelName}`,
            'age': `Edad de ${modelName}`,
            'weight': `Peso de ${modelName}`,
            'purpose': `Propósito de ${modelName}`,
            'race': `Raza de ${modelName}`,
            'cageNumber': `Número de jaula`,
            'rabbitCode': `Código del conejo`,
            'status': `Estado de ${modelName}`,
            'createdAt': `Fecha de creación`,
            'updatedAt': `Fecha de actualización`
        };

        return descriptions[fieldName] || `Campo ${fieldName} de ${modelName}`;
    }

    generateSchemaFromModel(model) {
        const schema = { type: 'object', properties: {} };
        Object.keys(model).forEach(field => {
            schema.properties[field] = { ...model[field] };
        });
        return schema;
    }

    extractRouteName(routePath) {
        const parts = routePath.split('/').filter(part => part && !part.startsWith(':'));
        const lastPart = parts[parts.length - 1];

        if (parts.length === 1) {
            return this.pluralToSingular(lastPart);
        }

        return `${this.pluralToSingular(lastPart)} por ${parts[parts.length - 2]}`;
    }

    pluralToSingular(word) {
        if (!word) return 'Ruta';
        if (word.endsWith('s')) return word.slice(0, -1);
        return word;
    }

    generateSwaggerSpec() {
        const paths = {};

        this.routes.forEach(route => {
            if (!paths[route.path]) paths[route.path] = {};

            paths[route.path][route.method.toLowerCase()] = {
                tags: [this.capitalize(route.file.split('.')[0])],
                summary: this.generateSummary(route),
                description: this.generateDescription(route),
                parameters: this.generateParameters(route),
                requestBody: this.generateRequestBody(route),
                responses: this.generateResponses()
            };

            if (paths[route.path][route.method.toLowerCase()].parameters.length === 0) {
                delete paths[route.path][route.method.toLowerCase()].parameters;
            }
            if (!paths[route.path][route.method.toLowerCase()].requestBody) {
                delete paths[route.path][route.method.toLowerCase()].requestBody;
            }
        });

        return {
            openapi: '3.0.0',
            info: {
                title: 'API de Gestión de Criadero de Conejos',
                version: '2.0.0',
                description: 'Sistema para la gestión de jaulas, razas, conejos y asignaciones en criaderos.',
                contact: {
                    name: 'API Support',
                    email: 'support@rabbitmanagement.com'
                }
            },
            servers: [
                { url: 'http://localhost:5000', description: 'Servidor de desarrollo' }
            ],
            paths: paths,
            components: { schemas: this.modelSchemas }
        };
    }

    generateSummary(route) {
        return `${this.getActionByMethod(route.method)} ${route.routeName}`;
    }

    generateDescription(route) {
        return `${this.getActionDescription(route.method)} ${route.routeName}`;
    }

    generateParameters(route) {
        const params = [];

        const pathParams = route.path.match(/:(\w+)/g);
        if (pathParams) {
            pathParams.forEach(param => {
                const paramName = param.replace(':', '');
                params.push({
                    in: 'path',
                    name: paramName,
                    required: true,
                    schema: { type: this.getParamType(paramName) }
                });
            });
        }

        if (route.path.includes('/search')) {
            params.push({
                in: 'query',
                name: 'name',
                required: true,
                schema: { type: 'string' }
            });
        }

        return params;
    }

    generateRequestBody(route) {
        if (route.method === 'GET' || route.method === 'DELETE') return null;

        const entity = this.getEntityFromPath(route.path);
        const modelSchema = this.findModelSchema(entity);

        return {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: modelSchema || this.generateGenericSchema(entity)
                    }
                }
            }
        };
    }

    findModelSchema(entity) {
        const entityName = this.capitalize(entity);

        const specificMappings = {
            'AssignRabbit': 'AssignRabbit',
            'Assign-rabbit': 'AssignRabbit',
            'assignRabbit': 'AssignRabbit',
            'assignment': 'AssignRabbit',
            'assign-rabbit': 'AssignRabbit'
        };

        if (specificMappings[entityName] || specificMappings[entity]) {
            const key = specificMappings[entityName] || specificMappings[entity];
            return this.modelSchemas[key] ? this.modelSchemas[key].properties : null;
        }

        if (this.modelSchemas[entityName]) {
            return this.modelSchemas[entityName].properties;
        }

        for (const modelName in this.modelSchemas) {
            if (modelName.toLowerCase().includes(entity.toLowerCase()) ||
                entity.toLowerCase().includes(modelName.toLowerCase())) {
                return this.modelSchemas[modelName].properties;
            }
        }

        const similarModel = this.findSimilarModel(entity);
        if (similarModel) return this.modelSchemas[similarModel].properties;

        return null;
    }

    findSimilarModel(entity) {
        const entityLower = entity.toLowerCase();
        const modelNames = Object.keys(this.modelSchemas);

        for (const modelName of modelNames) {
            const modelLower = modelName.toLowerCase();
            if (modelLower.includes(entityLower) || entityLower.includes(modelLower)) return modelName;
            if (this.calculateSimilarity(entityLower, modelLower) > 0.5) return modelName;
        }

        return null;
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) return 1.0;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
        for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    generateGenericSchema(entity) {
        return { data: { type: 'object', description: `Datos de ${entity}` } };
    }

    generateResponses() {
        return {
            200: { description: 'Operación exitosa' },
            400: { description: 'Datos inválidos' },
            404: { description: 'Recurso no encontrado' },
            500: { description: 'Error interno del servidor' }
        };
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getActionByMethod(method) {
        const actions = { GET: 'Obtener', POST: 'Crear', PUT: 'Actualizar', DELETE: 'Eliminar' };
        return actions[method] || 'Operación';
    }

    getActionDescription(method) {
        const actions = { GET: 'Lista', POST: 'Crea', PUT: 'Actualiza', DELETE: 'Elimina' };
        return actions[method] || 'Realiza operación sobre';
    }

    getParamType(paramName) {
        if (paramName.includes('number') || paramName.includes('id')) return 'integer';
        return 'string';
    }

    getEntityFromPath(path) {
        const parts = path.split('/').filter(part => part && !part.startsWith(':'));
        return parts[parts.length - 1] || 'entity';
    }
}

module.exports = SwaggerAutoGenerator;
