const Rabbit = require('../models/rabbit');
const AssignRabbit = require('../models/assignRabbit');
const Cage = require('../models/cage');
const Race = require('../models/race');
const Vaccination = require('../models/vaccination');
const Deworming = require('../models/deworming');

const growthController = {
  // Actualizar edad automáticamente y obtener lista de conejos
  updateAgeAndGetRabbits: async (req, res) => {
    try {
      // Obtener todos los conejos
      const rabbits = await Rabbit.find().sort({ code: 1 });

      if (rabbits.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron conejos en el sistema'
        });
      }

      // Obtener asignaciones de jaulas
      const assignments = await AssignRabbit.find({ status: 'asignado' });
      const rabbitToCage = {};
      assignments.forEach(assignment => {
        rabbitToCage[assignment.rabbitCode] = assignment.cageNumber;
      });

      // Obtener información de razas
      const races = await Race.find();
      const raceMap = {};
      races.forEach(race => {
        raceMap[race.name] = race;
      });

      const now = new Date();
      let updatedRabbits = [];
      let noUpdateNeeded = [];

      // Función para calcular meses transcurridos desde el registro
      const calculateMonthsSinceRegistration = (registrationDate) => {
        const registration = new Date(registrationDate);
        const today = new Date();
        
        let months = (today.getFullYear() - registration.getFullYear()) * 12;
        months += today.getMonth() - registration.getMonth();
        
        // Si el día actual es menor que el día de registro, restamos un mes
        if (today.getDate() < registration.getDate()) {
          months--;
        }
        
        return Math.max(0, months); // No permitir valores negativos
      };

      // Actualizar edades
      for (const rabbit of rabbits) {
        // Si no tiene initialAge, usar la edad actual como edad inicial
        if (rabbit.initialAge === undefined || rabbit.initialAge === null) {
          rabbit.initialAge = rabbit.age;
          await rabbit.save();
        }

        const monthsSinceRegistration = calculateMonthsSinceRegistration(rabbit.createdAt);
        const newAge = rabbit.initialAge + monthsSinceRegistration;

        if (newAge !== rabbit.age) {
          rabbit.age = newAge;
          await rabbit.save();
          updatedRabbits.push(rabbit.code);
        } else {
          noUpdateNeeded.push(rabbit.code);
        }
      }

      // Obtener registros médicos para cada conejo
      const rabbitsWithDetails = await Promise.all(rabbits.map(async (rabbit) => {
        // Obtener registros de vacunación
        const vaccination = await Vaccination.findOne({ codigo: rabbit.code });
        let vaccinationStatus = 'Sin registros';
        if (vaccination) {
          const lastVaccination = vaccination.lastMixomatosisDate || vaccination.lastVhdDate;
          if (lastVaccination) {
            vaccinationStatus = new Date(lastVaccination).toLocaleDateString();
          }
        }

        // Obtener registros de desparasitación
        const deworming = await Deworming.findOne({ codigo: rabbit.code });
        let dewormingStatus = 'Sin registros';
        if (deworming && deworming.lastDewormingDate) {
          dewormingStatus = new Date(deworming.lastDewormingDate).toLocaleDateString();
        }

        return {
          _id: rabbit._id,
          code: rabbit.code,
          race: raceMap[rabbit.race] || { name: rabbit.race },
          sex: rabbit.sex,
          age: rabbit.age,
          weight: rabbit.weight,
          cage: rabbitToCage[rabbit.code] ? { cageNumber: rabbitToCage[rabbit.code] } : null,
          createdAt: rabbit.createdAt,
          lastVaccination: vaccinationStatus,
          lastDeworming: dewormingStatus
        };
      }));

      // Preparar mensaje de actualización
      let ageUpdateMessage = '';
      if (updatedRabbits.length > 0) {
        ageUpdateMessage = `La edad de los conejos ha sido actualizada: ${updatedRabbits.join(', ')}`;
      }
      
      if (noUpdateNeeded.length > 0) {
        const noUpdateMsg = `No es necesario actualizar la edad de: ${noUpdateNeeded.join(', ')}`;
        ageUpdateMessage = ageUpdateMessage ? `${ageUpdateMessage}. ${noUpdateMsg}` : noUpdateMsg;
      }

      res.json({
        success: true,
        message: ageUpdateMessage,
        data: {
          rabbits: rabbitsWithDetails,
          updatedCount: updatedRabbits.length,
          totalCount: rabbits.length
        }
      });

    } catch (error) {
      console.error('Error al actualizar edades y obtener conejos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al procesar la solicitud'
      });
    }
  },

  // Actualizar peso de conejos seleccionados
  updateWeight: async (req, res) => {
    try {
      const { rabbitIds, weightChange } = req.body;

      // Validaciones
      if (!rabbitIds || !Array.isArray(rabbitIds) || rabbitIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar una lista válida de IDs de conejos'
        });
      }

      if (weightChange === undefined || weightChange === null || isNaN(weightChange) || parseFloat(weightChange) === 0) {
        return res.status(400).json({
          success: false,
          message: 'El cambio de peso debe ser un número diferente de cero'
        });
      }

      const change = parseFloat(weightChange);
      const MAX_WEIGHT_CHANGE = 4.5; // kg para incrementos
      const MIN_WEIGHT_THRESHOLD = 2.0; // kg peso mínimo

      // Validar límites de cambio de peso
      if (Math.abs(change) > MAX_WEIGHT_CHANGE) {
        return res.status(400).json({
          success: false,
          message: `El cambio de peso no puede ser mayor a ${MAX_WEIGHT_CHANGE} kg en valor absoluto`
        });
      }

      // Obtener conejos por IDs
      const rabbits = await Rabbit.find({ _id: { $in: rabbitIds } });

      if (rabbits.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron conejos con los IDs proporcionados'
        });
      }

      let successfulUpdates = [];
      let warnings = [];
      let errors = [];

      // Actualizar peso de cada conejo
      for (const rabbit of rabbits) {
        try {
          const currentWeight = parseFloat(rabbit.weight) || 0;
          const newWeight = currentWeight + change;

          // Validar peso mínimo (no puede ser menor a 2 kg)
          if (newWeight < MIN_WEIGHT_THRESHOLD) {
            errors.push({
              code: rabbit.code,
              message: `Peso resultante (${newWeight.toFixed(2)} kg) está por debajo del mínimo permitido (${MIN_WEIGHT_THRESHOLD} kg). Operación rechazada.`
            });
            continue;
          }

          // Validación de peso máximo absoluto: 5 kg
          const MAX_WEIGHT_ABSOLUTE = 5.0;
          if (newWeight > MAX_WEIGHT_ABSOLUTE) {
            errors.push({
              code: rabbit.code,
              message: `Peso resultante (${newWeight.toFixed(2)} kg) excede el máximo absoluto permitido (${MAX_WEIGHT_ABSOLUTE} kg). Operación rechazada.`
            });
            continue;
          }

          // Alerta para peso entre 4.5 kg y 5 kg
          const WEIGHT_WARNING_THRESHOLD = 4.5;
          if (newWeight > WEIGHT_WARNING_THRESHOLD && newWeight <= MAX_WEIGHT_ABSOLUTE) {
            warnings.push({
              code: rabbit.code,
              message: `ALERTA: Peso resultante (${newWeight.toFixed(2)} kg) supera el límite recomendado de ${WEIGHT_WARNING_THRESHOLD} kg. El conejo está sobrepasando el peso ideal.`
            });
          }

          rabbit.weight = parseFloat(newWeight.toFixed(2));
          await rabbit.save();
          
          successfulUpdates.push({
            code: rabbit.code,
            previousWeight: currentWeight,
            newWeight: rabbit.weight,
            change: change
          });

        } catch (error) {
          errors.push({
            code: rabbit.code,
            error: error.message
          });
        }
      }

      // Preparar respuesta
      let message = `Se actualizó el peso de ${successfulUpdates.length} conejo(s) exitosamente`;
      
      const response = {
        success: true,
        message,
        data: {
          successful: successfulUpdates,
          totalUpdated: successfulUpdates.length,
          totalRequested: rabbitIds.length
        }
      };

      if (warnings.length > 0) {
        response.warnings = warnings;
        response.warningMessage = 'Advertencias encontradas';
      }

      if (errors.length > 0) {
        response.errors = errors;
        response.errorMessage = 'Errores encontrados';
      }

      res.json(response);

    } catch (error) {
      console.error('Error al actualizar peso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al actualizar el peso'
      });
    }
  }
};

module.exports = growthController;
