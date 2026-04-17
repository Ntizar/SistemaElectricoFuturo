/**
 * ============================================================================
 *  ESCENARIOS PREDEFINIDOS
 * ============================================================================
 *  Cada escenario parte de SEF.PARAMS_DEFAULT y sólo sobrescribe los
 *  parámetros relevantes. Todos los textos están en castellano con ñ y tildes.
 * ============================================================================
 */

'use strict';

(function() {
    function escenario(id, nombre, icono, descripcion, params, extra = {}) {
        return {
            id,
            nombre,
            icono,
            descripcion,
            estilo: extra.estilo || 'default',
            anio: extra.anio || params.anioObjetivo || SEF.PARAMS_DEFAULT.anioObjetivo,
            params: { ...SEF.PARAMS_DEFAULT, ...params },
        };
    }

    SEF.ESCENARIOS = [
        escenario(
            0,
            'Datos Reales 2025',
            '📅',
            'Aproxima el sistema español observado en 2025: demanda moderada, eólica marina casi inexistente y almacenamiento todavía limitado.',
            {
                anioObjetivo: 2026,
                nuclear: 7.0,
                solar: 24.7,
                eolica: 31.6,
                eolicaOffshore: 0,
                hidraulica: 17.1,
                ccgt: 24.0,
                bateriasPotencia: 3.0,
                bateriasCapacidad: 10,
                precioGas: 42,
                precioCO2: 65,
                demandaAnual: 248,
                crecimientoDemanda: 0.2,
                electrificacionTWh: 1.0,
                eficienciaDemanda: 0.2,
                vePorcentajeParque: 2,
                bombaCalorPct: 8,
                h2ObjetivoMt: 0.05,
                autoconsumoFV_GW: 8,
            },
            { estilo: 'reference', anio: 2025 }
        ),
        escenario(
            1,
            'PNIEC Base 2030',
            '📊',
            'Escenario base con despliegue renovable fuerte, cierre nuclear progresivo y almacenamiento alineado con el PNIEC.',
            {
                anioObjetivo: 2030,
                nuclear: 7.0,
                solar: 76,
                eolica: 62,
                eolicaOffshore: 1,
                hidraulica: 17,
                ccgt: 26,
                bateriasPotencia: 14,
                bateriasCapacidad: 56,
                bombeo: 7,
                bombeoCapacidad: 50,
                precioGas: 45,
                precioCO2: 85,
                demandaAnual: 255,
                crecimientoDemanda: 0.8,
                electrificacionTWh: 3.2,
                eficienciaDemanda: 0.8,
                flexibilidadGW: 6,
                flexibilidadPct: 9,
                interconexion: 4.2,
                vePorcentajeParque: 18,
                smartChargingPct: 60,
                bombaCalorPct: 24,
                h2ObjetivoMt: 0.35,
                autoconsumoFV_GW: 14,
            }
        ),
        escenario(
            2,
            'Prórroga Nuclear',
            '⚛️',
            'Extiende la vida útil del parque nuclear y reduce la urgencia de desplegar almacenamiento y gas de respaldo.',
            {
                anioObjetivo: 2032,
                aplicarPlanNuclear: true,
                prorrogaNuclear: true,
                prorrogaGlobal: 10,
                solar: 64,
                eolica: 50,
                ccgt: 22,
                bateriasPotencia: 10,
                bateriasCapacidad: 40,
                precioCO2: 78,
                vePorcentajeParque: 16,
                bombaCalorPct: 20,
                h2ObjetivoMt: 0.2,
            }
        ),
        escenario(
            3,
            'Sin Nuclear',
            '🚀',
            'Cierre acelerado del parque nuclear en 2028 con máxima presión sobre renovables, flexibilidad y gas de respaldo.',
            {
                anioObjetivo: 2030,
                aplicarPlanNuclear: true,
                cierreNuclear: 2028,
                solar: 95,
                eolica: 70,
                eolicaOffshore: 2,
                ccgt: 30,
                bateriasPotencia: 25,
                bateriasCapacidad: 100,
                bombeo: 10,
                bombeoCapacidad: 60,
                precioGas: 52,
                precioCO2: 92,
                flexibilidadGW: 8,
                flexibilidadPct: 11,
                interconexion: 4.8,
                vePorcentajeParque: 20,
                smartChargingPct: 62,
                bombaCalorPct: 24,
                h2ObjetivoMt: 0.35,
            }
        ),
        escenario(
            4,
            'Almacenamiento Masivo',
            '🔋',
            'Baterías y bombeo a escala industrial para absorber vertidos y desplazar energía renovable a las horas punta.',
            {
                anioObjetivo: 2032,
                solar: 82,
                eolica: 60,
                eolicaOffshore: 2,
                bateriasPotencia: 40,
                bateriasCapacidad: 160,
                bombeo: 12,
                bombeoCapacidad: 85,
                flexibilidadGW: 8,
                flexibilidadPct: 13,
                interconexion: 5,
                vePorcentajeParque: 22,
                smartChargingPct: 68,
                v2gPct: 12,
            }
        ),
        escenario(
            5,
            'Crisis del Gas',
            '💨',
            'Gas y CO₂ disparados, con tensión estructural en el pool y fuerte incentivo para acelerar almacenamiento y electrificación eficiente.',
            {
                anioObjetivo: 2027,
                solar: 34,
                eolica: 36,
                precioGas: 95,
                precioCO2: 105,
                rendimientoCCGT: 0.53,
                omCCGT: 4.2,
                hidraulicidad: 0.9,
                precioImport: 145,
                precioEscasez: 520,
            }
        ),
        escenario(
            6,
            'Hidrógeno Verde',
            '🟢',
            'Electrolizadores como demanda flexible estructural que absorben excedentes solares y eólicos en las horas de baja señal de precio.',
            {
                anioObjetivo: 2033,
                solar: 92,
                eolica: 66,
                eolicaOffshore: 2.5,
                bateriasPotencia: 14,
                bateriasCapacidad: 56,
                ccgt: 20,
                demandaAnual: 260,
                crecimientoDemanda: 1.0,
                electrificacionTWh: 5.0,
                flexibilidadGW: 12,
                flexibilidadPct: 15,
                h2ObjetivoMt: 0.8,
                h2FlexibilidadHoras: 12,
            }
        ),
        escenario(
            7,
            'Sequía Extrema',
            '🏜️',
            'Dos años secos consecutivos y baja hidraulicidad estructural que elevan la dependencia del gas y de la importación.',
            {
                anioObjetivo: 2028,
                hidraulicidad: 0.55,
                sequiaClusterAnios: 2,
                solar: 42,
                eolica: 38,
                precioImport: 110,
                precioEscasez: 390,
            }
        ),
        escenario(
            8,
            'Cierre Nuclear ENRESA',
            '📉',
            'Usa el calendario oficial de cierres sin prórroga para tensionar el sistema entre 2027 y 2035.',
            {
                anioObjetivo: 2035,
                aplicarPlanNuclear: true,
                prorrogaNuclear: false,
                solar: 90,
                eolica: 70,
                eolicaOffshore: 2.5,
                bateriasPotencia: 22,
                bateriasCapacidad: 90,
                interconexion: 5.2,
                vePorcentajeParque: 26,
                bombaCalorPct: 30,
                h2ObjetivoMt: 0.55,
            }
        ),
        escenario(
            9,
            'Prórroga 60 Años',
            '🧱',
            'Escenario defensivo de seguridad de suministro con prórroga larga del parque nuclear y despliegue renovable menos abrupto.',
            {
                anioObjetivo: 2035,
                prorrogaNuclear: true,
                prorrogaGlobal: 20,
                solar: 72,
                eolica: 56,
                eolicaOffshore: 1.5,
                ccgt: 20,
                bateriasPotencia: 12,
                bateriasCapacidad: 48,
            }
        ),
        escenario(
            10,
            'Apagón Ibérico Repetido',
            '🌩️',
            'Replica una semana de estrés tipo abril 2025 para forzar chequeos de inercia, reserva rodante e importaciones.',
            {
                anioObjetivo: 2029,
                eventoApagonPct: 12,
                inerciaMinGW: 4,
                reservaRodantePct: 5,
                precioEscasez: 580,
                interconexion: 4.5,
            }
        ),
        escenario(
            11,
            'VE Masivo 2030',
            '🚗',
            'Penetración masiva del vehículo eléctrico con carga inteligente y una capa inicial de V2G.',
            {
                anioObjetivo: 2030,
                vePorcentajeParque: 33,
                smartChargingPct: 70,
                v2gPct: 15,
                demandaAnual: 258,
                electrificacionTWh: 5.2,
                bateriasPotencia: 18,
                bateriasCapacidad: 72,
            }
        ),
        escenario(
            12,
            'Autoconsumo 30 GW',
            '🏠',
            'La FV detrás del contador desplaza demanda residual diurna y canibaliza los precios solares del mediodía.',
            {
                anioObjetivo: 2031,
                autoconsumoFV_GW: 30,
                solar: 82,
                eolica: 58,
                bateriasPotencia: 18,
                bateriasCapacidad: 80,
                precioExport: 3,
            }
        ),
        escenario(
            13,
            'PNIEC 2030 Actualizado',
            '🧭',
            'Versión más ambiciosa con 81 GW solares, 62 GW eólicos terrestres, 3 GW offshore y 22 GW de almacenamiento.',
            {
                anioObjetivo: 2030,
                solar: 81,
                eolica: 62,
                eolicaOffshore: 3,
                bateriasPotencia: 15,
                bateriasCapacidad: 60,
                bombeo: 7,
                bombeoCapacidad: 50,
                interconexion: 4.6,
                vePorcentajeParque: 20,
                bombaCalorPct: 26,
            }
        ),
        escenario(
            14,
            'Ley de Cambio Climático 2050',
            '📈',
            'Escenario de trayectoria multianual con senda de descarbonización y electrificación acelerada hasta 2035.',
            {
                anioObjetivo: 2035,
                leyCambioClimaticoActiva: true,
                solar: 70,
                eolica: 54,
                eolicaOffshore: 1.8,
                solarRampaGW_anio: 5.2,
                eolicaTerrestreRampa: 2.6,
                eolicaOffshoreRampa: 0.35,
                bateriasRampaGW_anio: 1.8,
                interconexionRampaGW_anio: 0.35,
                vePorcentajeParque: 15,
                bombaCalorPct: 18,
                h2ObjetivoMt: 0.2,
            }
        ),
        escenario(
            15,
            'Ola de Calor Extrema',
            '🌡️',
            'Dos semanas de calor severo que elevan la demanda, reducen el rendimiento solar y tensionan la reserva operativa.',
            {
                anioObjetivo: 2031,
                olaCalorExtrema: true,
                demandaAnual: 260,
                crecimientoDemanda: 1.1,
                precioEscasez: 540,
                reservaRodantePct: 5,
                smartChargingPct: 65,
            }
        ),
        escenario(
            16,
            'Crisis Geopolítica Gas + CO₂',
            '🛢️',
            'Shock energético europeo con TTF a 110 €/MWh, ETS a 140 €/t y prórroga nuclear defensiva para contener precios.',
            {
                anioObjetivo: 2032,
                prorrogaNuclear: true,
                prorrogaGlobal: 12,
                precioGas: 110,
                precioCO2: 140,
                precioImport: 165,
                precioEscasez: 600,
                cfdRenovables_strike: 65,
                topeIbericoActivo: true,
            }
        ),
    ];

    SEF.getEscenario = function(id) {
        return SEF.ESCENARIOS.find(item => item.id === id) || null;
    };
})();
