export const STANDARD_COURSES = [
  {
    courseId: "KSHB_AE_CIVIL_2025",
    title: "Assistant Engineer (Civil) - KSHB",
    categoryNumbers: ["097/2025", "180/2025"],
    totalMarks: 100,
    modules: [
      {
        moduleNumber: 1,
        title: "Mechanics of Solids and Structural Analysis",
        marks: 10,
        subtopics: [
          "Solid Mechanics: Stress & strain, Bending moment & shear force, Stresses in beams, Deflection of beams, Theory of columns.",
          "Structural Analysis: Truss analysis, Displacement response of determinate systems using energy methods, Virtual work, Strain Energy, Moving loads, Influence lines, Arches.",
          "Advanced Structural Methods: Indeterminate structures, Slope Deflection Method, Moment Distribution Method, Clapeyron's Three Moment Equation, Kani's method."
        ]
      },
      {
        moduleNumber: 2,
        title: "Fluid Mechanics and Water Resources Engineering",
        marks: 10,
        subtopics: [
          "Fluid Mechanics & Machinery: Fluid Statics (Buoyancy, floatation), Kinematics, Dynamics, Orifice & notches, Flow through pipes, Boundary layer, Drag and Lift. Turbines, Centrifugal Pumps, Open channel flow, Hydraulic Jump, Gradually varied flow, Dimensional analysis.",
          "Hydrology: Hydrologic cycle, Precipitation, Infiltration & Evaporation, Runoff computation, Unit Hydrograph, S-Hydrograph.",
          "Irrigation & Surface Water: Soil-water-plant relationships, Crop water requirement, Stream flow measurement, River training, Reservoirs, Sedimentation, Useful life.",
          "Groundwater: Aquifer types, Steady radial flow into well, Yield of open well."
        ]
      },
      {
        moduleNumber: 3,
        title: "Surveying and Levelling, Quantity Surveying and Valuation",
        marks: 10,
        subtopics: [
          "Surveying: Basics, Levelling and Contouring, Area/Volume computation, Theodolite, Mass Diagram, Triangulation, Theory of Errors.",
          "Advanced Surveying: EDM, Total Station, GPS, Remote Sensing, GIS.",
          "Quantity Surveying (Estimation): Analysis of rates, Data book & schedule of rates, Detailed specifications, Bar bending schedules for RCC.",
          "Valuation: Methods of valuation, Depreciation, Fixation of rent."
        ]
      },
      {
        moduleNumber: 4,
        title: "Building Materials, Construction Technology & Management",
        marks: 20,
        subtopics: [
          "Building Materials: Timber, Mortar, Iron and Steel, Structural steel, Concrete (Admixtures, Making, Properties, Mix proportioning).",
          "Construction Technology: Foundations, Cost-effective construction, Masonry, Lintels & arches, Floors, Roofs, Doors & windows, Finishing, Stairs, Elevators, Escalators.",
          "Advanced Construction: Tall Buildings, Prefabricated construction, Slip form construction, Building failures & Retrofitting.",
          "Construction Management: Planning & Scheduling, Disputes & settlement, Ethics, Safety, Materials & Quality management."
        ]
      },
      {
        moduleNumber: 5,
        title: "Environmental Engineering",
        marks: 10,
        subtopics: [
          "Water Supply: Sources & demand, Population forecasting, Water quality, Water treatment (Sedimentation, flocculator, filters, membrane, disinfection), Hardy Cross analysis.",
          "Wastewater: Sources, BOD/COD, Circular sewer design, Streeter Phelps equation, Oxygen sag curve, Treatment (Screening, Grit chamber, ASP, Trickling filter, RBC, Septic tanks, UASB, Sludge digestion).",
          "Air Pollution: Sources, Effects, Air pollutant control, Air quality legislations."
        ]
      },
      {
        moduleNumber: 6,
        title: "Design of Structures (RCC, Steel & Timber)",
        marks: 20,
        subtopics: [
          "RCC Design: Limit state method, Rectangular beams, Shear reinforcement, Bond & development length, Torsion. One-way, Two-way, Cantilever & Continuous slabs, Staircases, Columns, Strip footing.",
          "Retaining Walls & Tanks: Cantilever & counterfort retaining walls, Water tanks design & IS recommendations.",
          "Prestressed Concrete: Concept, Systems, Losses, Analysis of prestressed rectangular and I-sections.",
          "Steel & Timber: Bolted & welded connections, Tension & compression members, Beams, Roof trusses, Purlins, Timber columns."
        ]
      },
      {
        moduleNumber: 7,
        title: "Geotechnical Engineering",
        marks: 10,
        subtopics: [
          "Soil Mechanics: India soil deposits, 3-phase soil system, Permeability, Effective stress, Shear characteristics, 1D Consolidation (Terzaghi), Compaction.",
          "Earth Pressure & Stability: Slope stability (Swedish Circle, Friction Circle), Boussinesq's formula, Newmark's chart, Rankine & Coulomb lateral earth pressure.",
          "Foundation Engineering: Bearing capacity, Settlement estimation, SPT, Plate load test, Shallow/deep/machine foundations, Ground improvement."
        ]
      },
      {
        moduleNumber: 8,
        title: "Transportation Engineering and Urban Planning",
        marks: 10,
        subtopics: [
          "Highway Engineering: Classification, Geometric design, Pavement materials testing, CBR design of flexible pavements, Maintenance.",
          "Traffic Engineering: Characteristics, Studies, Traffic control devices, Safety, Traffic flow theory.",
          "Airports, Railways, Tunnels & Harbours: Airport lighting/runways, Railway permanent way/maintenance, Tunnel ventilation, Harbours.",
          "Urban Planning: Regional planning, Urbanization theories, Zoning, Town Development Plans, Planning acts."
        ]
      }
    ]
  },
  {
    courseId: "OVERSEER_GR2_CIVIL_2025",
    title: "Overseer Gr.II / Third Grade Overseer / Draftsman",
    categoryNumbers: ["882/2025", "567/2025", "222/2025"],
    totalMarks: 100,
    modules: [
      { moduleNumber: 1, title: "Building Materials", marks: 15, subtopics: ["Rock, stone, brick, lime, cement, pozzolana", "Clay products, earthenware, terracotta", "Mortar, concrete & admixtures", "Timber seasoning & defects", "Paints, varnishes, synthetics"] },
      { moduleNumber: 2, title: "Construction Technology", marks: 15, subtopics: ["Masonry (bonds, arches, lintels)", "Shallow & deep foundations, black cotton soil", "Formwork, scaffolding, shoring, underpinning", "DPC, anti-termite, weathering course", "Carpentry joints, fixtures, doors & windows", "Floors & roofs"] },
      { moduleNumber: 3, title: "Building Drawing and Planning", marks: 10, subtopics: ["Drafting basics, lettering, dimensioning, scales", "IS: 962-1989 Architectural Drawings Code", "Building Bye-laws, layout/key/submission plans", "CAD GUI, setup, commands"] },
      { moduleNumber: 4, title: "RCC and Steel Structures", marks: 10, subtopics: ["Concrete mixing, slump test, bar bending per IS Code", "RCC Columns, beams, slabs, retaining walls", "Steel sections, structural fasteners, tension/compression members"] },
      { moduleNumber: 5, title: "Public Health and Sanitary Engineering", marks: 5, subtopics: ["Sanitation terms, house drainage, plumbing fittings", "Water purification, manholes, septic tanks"] },
      { moduleNumber: 6, title: "Roads, Railways, Bridges, and Tunnels", marks: 10, subtopics: ["Road alignment, curves, gradients, drainage", "Bridge components, caissons, cofferdams", "Permanent way, rail gauges, coning of wheels, creep of rail", "Tunnel sizing"] },
      { moduleNumber: 7, title: "Irrigation Engineering", marks: 10, subtopics: ["Duty, delta, base period, Rabi/Kharif, hydrographs", "Dams, barrages, weirs, hydro-electric parts", "Canal distribution, Cross-drainage works"] },
      { moduleNumber: 8, title: "Estimating and Costing", marks: 5, subtopics: ["Units of measurement, taking-off quantities", "Rate analysis, specifications, schedule of rates", "Trapezoidal & Simpson's area formulas"] },
      { moduleNumber: 9, title: "Surveying and Levelling", marks: 10, subtopics: ["Chaining, compass survey, local attraction, declination", "Dumpy/auto level, levelling staff, benchmark, reduced levels, contouring"] },
      { moduleNumber: 10, title: "Engineering Mechanics", marks: 10, subtopics: ["Stress, strain, Hooke's law, mild steel curve", "Centroid, Moment of Inertia, Radius of gyration, Parallel/Perpendicular axis theorems", "Friction, angle of repose", "Varignon's & Lami's theorems"] }
    ]
  }
];