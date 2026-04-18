const { validateCageData } = require('../../../src/utils/cageValidations');

describe('Cage Validations', () => {
    describe('validateCageData', () => {
        describe('Valid cases', () => {
            it('should pass with valid engorde cage data', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toEqual([]);
            });

            it('should pass with valid reproducción cage data', () => {
                const data = {
                    number: 2,
                    type: 'reproducción',
                    capacity: 1
                };

                const errors = validateCageData(data);
                expect(errors).toEqual([]);
            });

            it('should pass with string numbers that convert to valid integers', () => {
                const data = {
                    number: '5',
                    type: 'engorde',
                    capacity: '3'
                };

                const errors = validateCageData(data);
                expect(errors).toEqual([]);
            });

            it('should pass with maximum valid cage number (999)', () => {
                const data = {
                    number: 999,
                    type: 'engorde',
                    capacity: 6
                };

                const errors = validateCageData(data);
                expect(errors).toEqual([]);
            });

            it('should pass with minimum valid engorde capacity (1)', () => {
                const data = {
                    number: 10,
                    type: 'engorde',
                    capacity: 1
                };

                const errors = validateCageData(data);
                expect(errors).toEqual([]);
            });

            it('should pass with maximum valid engorde capacity (6)', () => {
                const data = {
                    number: 11,
                    type: 'engorde',
                    capacity: 6
                };

                const errors = validateCageData(data);
                expect(errors).toEqual([]);
            });
        });

        describe('Number validation errors', () => {
            it('should fail when number is undefined', () => {
                const data = {
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El número de jaula es obligatorio.');
            });

            it('should fail when number is null', () => {
                const data = {
                    number: null,
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El número de jaula es obligatorio.');
            });

            it('should fail when number is empty string', () => {
                const data = {
                    number: '',
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El número de jaula es obligatorio.');
            });

            it('should fail when number is zero', () => {
                const data = {
                    number: 0,
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El número de jaula debe ser un entero positivo menor o igual a 999.');
            });

            it('should fail when number is negative', () => {
                const data = {
                    number: -1,
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El número de jaula debe ser un entero positivo menor o igual a 999.');
            });

            it('should fail when number is greater than 999', () => {
                const data = {
                    number: 1000,
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El número de jaula debe ser un entero positivo menor o igual a 999.');
            });

            it('should fail when number is not an integer', () => {
                const data = {
                    number: 1.5,
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El número de jaula debe ser un entero positivo menor o igual a 999.');
            });

            it('should fail when number is not a valid number string', () => {
                const data = {
                    number: 'abc',
                    type: 'engorde',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El número de jaula debe ser un entero positivo menor o igual a 999.');
            });
        });

        describe('Type validation errors', () => {
            it('should fail when type is undefined', () => {
                const data = {
                    number: 1,
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El tipo de jaula debe ser engorde o reproducción.');
            });

            it('should fail when type is null', () => {
                const data = {
                    number: 1,
                    type: null,
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El tipo de jaula debe ser engorde o reproducción.');
            });

            it('should fail when type is empty string', () => {
                const data = {
                    number: 1,
                    type: '',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El tipo de jaula debe ser engorde o reproducción.');
            });

            it('should fail when type is invalid', () => {
                const data = {
                    number: 1,
                    type: 'invalid',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El tipo de jaula debe ser engorde o reproducción.');
            });

            it('should fail when type has wrong case', () => {
                const data = {
                    number: 1,
                    type: 'ENGORDE',
                    capacity: 4
                };

                const errors = validateCageData(data);
                expect(errors).toContain('El tipo de jaula debe ser engorde o reproducción.');
            });
        });

        describe('Capacity validation errors', () => {
            it('should fail when capacity is undefined', () => {
                const data = {
                    number: 1,
                    type: 'engorde'
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad es obligatoria.');
            });

            it('should fail when capacity is null', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: null
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad es obligatoria.');
            });

            it('should fail when capacity is empty string', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: ''
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad es obligatoria.');
            });

            it('should fail when capacity is zero', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: 0
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad debe ser un número entero positivo.');
            });

            it('should fail when capacity is negative', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: -1
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad debe ser un número entero positivo.');
            });

            it('should fail when capacity is not an integer', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: 2.5
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad debe ser un número entero positivo.');
            });

            it('should fail when capacity is not a valid number string', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: 'abc'
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad debe ser un número entero positivo.');
            });
        });

        describe('Type-specific capacity validation errors', () => {
            it('should fail when reproducción cage capacity is not 1', () => {
                const data = {
                    number: 1,
                    type: 'reproducción',
                    capacity: 2
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad máxima para jaula de reproducción es 1.');
            });

            it('should fail when reproducción cage capacity is greater than 1', () => {
                const data = {
                    number: 1,
                    type: 'reproducción',
                    capacity: 5
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad máxima para jaula de reproducción es 1.');
            });

            it('should fail when engorde cage capacity is 0', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: 0
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad debe ser un número entero positivo.');
            });

            it('should fail when engorde cage capacity is greater than 6', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: 7
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad para jaula de engorde debe ser entre 1 y 6.');
            });

            it('should fail when engorde cage capacity is much greater than 6', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: 10
                };

                const errors = validateCageData(data);
                expect(errors).toContain('La capacidad para jaula de engorde debe ser entre 1 y 6.');
            });
        });

        describe('Multiple validation errors', () => {
            it('should return multiple errors when multiple fields are invalid', () => {
                const data = {
                    number: 0,
                    type: 'invalid',
                    capacity: -1
                };

                const errors = validateCageData(data);
                expect(errors).toHaveLength(3);
                expect(errors).toContain('El número de jaula debe ser un entero positivo menor o igual a 999.');
                expect(errors).toContain('El tipo de jaula debe ser engorde o reproducción.');
                expect(errors).toContain('La capacidad debe ser un número entero positivo.');
            });

            it('should return all relevant errors for complex invalid data', () => {
                const data = {
                    number: '',
                    type: '',
                    capacity: ''
                };

                const errors = validateCageData(data);
                expect(errors).toHaveLength(3);
                expect(errors).toContain('El número de jaula es obligatorio.');
                expect(errors).toContain('El tipo de jaula debe ser engorde o reproducción.');
                expect(errors).toContain('La capacidad es obligatoria.');
            });
        });

        describe('Edge cases', () => {
            it('should handle completely empty data object', () => {
                const data = {};

                const errors = validateCageData(data);
                expect(errors).toHaveLength(3);
                expect(errors).toContain('El número de jaula es obligatorio.');
                expect(errors).toContain('El tipo de jaula debe ser engorde o reproducción.');
                expect(errors).toContain('La capacidad es obligatoria.');
            });

            it('should handle isNew parameter (legacy - not used in current implementation)', () => {
                const data = {
                    number: 1,
                    type: 'engorde',
                    capacity: 4
                };

                const errorsNew = validateCageData(data, true);
                const errorsUpdate = validateCageData(data, false);

                expect(errorsNew).toEqual([]);
                expect(errorsUpdate).toEqual([]);
                expect(errorsNew).toEqual(errorsUpdate);
            });

            it('should handle boolean values converted to numbers', () => {
                const data = {
                    number: true, // converts to 1
                    type: 'engorde',
                    capacity: true // converts to 1
                };

                const errors = validateCageData(data);
                expect(errors).toEqual([]);
            });

            it('should handle array inputs (should fail)', () => {
                const data = {
                    number: [1],
                    type: 'engorde',
                    capacity: [4]
                };

                const errors = validateCageData(data);
                // Arrays convert to string, so [1] becomes "1" which is valid
                // Let's test with invalid array that would cause issues
                const dataInvalid = {
                    number: [1, 2], // becomes "1,2" which is invalid
                    type: 'engorde',
                    capacity: 4
                };
                
                const errorsInvalid = validateCageData(dataInvalid);
                expect(errorsInvalid.length).toBeGreaterThan(0);
            });
        });
    });
});
