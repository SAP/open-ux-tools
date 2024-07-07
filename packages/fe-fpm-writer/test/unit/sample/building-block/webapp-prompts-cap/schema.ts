export const testSchema = {
    namespace: 'IncidentService',
    annotations: {
        './app/incidents/annotations.cds': [
            {
                target: 'IncidentService.Incidents',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.UI.v1.LineItem',
                        origin: {
                            start: {
                                line: 5,
                                character: 4
                            },
                            end: {
                                line: 22,
                                character: 5
                            }
                        },
                        collection: [
                            {
                                propertyValues: [
                                    {
                                        name: 'Value',
                                        value: {
                                            type: 'Path',
                                            Path: 'identifier'
                                        }
                                    }
                                ],
                                propertyValuesOrigins: [
                                    {
                                        start: {
                                            line: 8,
                                            character: 12
                                        },
                                        end: {
                                            line: 8,
                                            character: 29
                                        }
                                    }
                                ],
                                type: 'com.sap.vocabularies.UI.v1.DataField'
                            },
                            {
                                propertyValues: [
                                    {
                                        name: 'Value',
                                        value: {
                                            type: 'Path',
                                            Path: 'title'
                                        }
                                    }
                                ],
                                propertyValuesOrigins: [
                                    {
                                        start: {
                                            line: 12,
                                            character: 12
                                        },
                                        end: {
                                            line: 12,
                                            character: 24
                                        }
                                    }
                                ],
                                type: 'com.sap.vocabularies.UI.v1.DataField'
                            },
                            {
                                propertyValues: [
                                    {
                                        name: 'Value',
                                        value: {
                                            type: 'Path',
                                            Path: 'category_code'
                                        }
                                    }
                                ],
                                propertyValuesOrigins: [
                                    {
                                        start: {
                                            line: 16,
                                            character: 12
                                        },
                                        end: {
                                            line: 16,
                                            character: 32
                                        }
                                    }
                                ],
                                type: 'com.sap.vocabularies.UI.v1.DataField'
                            },
                            {
                                propertyValues: [
                                    {
                                        name: 'Value',
                                        value: {
                                            type: 'Path',
                                            Path: 'priority_code'
                                        }
                                    }
                                ],
                                propertyValuesOrigins: [
                                    {
                                        start: {
                                            line: 20,
                                            character: 12
                                        },
                                        end: {
                                            line: 20,
                                            character: 32
                                        }
                                    }
                                ],
                                type: 'com.sap.vocabularies.UI.v1.DataField'
                            }
                        ],
                        collectionOrigins: [
                            {
                                start: {
                                    line: 6,
                                    character: 8
                                },
                                end: {
                                    line: 9,
                                    character: 9
                                }
                            },
                            {
                                start: {
                                    line: 10,
                                    character: 8
                                },
                                end: {
                                    line: 13,
                                    character: 9
                                }
                            },
                            {
                                start: {
                                    line: 14,
                                    character: 8
                                },
                                end: {
                                    line: 17,
                                    character: 9
                                }
                            },
                            {
                                start: {
                                    line: 18,
                                    character: 8
                                },
                                end: {
                                    line: 21,
                                    character: 9
                                }
                            }
                        ]
                    },
                    {
                        term: 'com.sap.vocabularies.UI.v1.SelectionFields',
                        origin: {
                            start: {
                                line: 23,
                                character: 4
                            },
                            end: {
                                line: 26,
                                character: 5
                            }
                        },
                        collection: [
                            {
                                type: 'PropertyPath',
                                PropertyPath: 'description'
                            },
                            {
                                type: 'PropertyPath',
                                PropertyPath: 'priority/criticality'
                            }
                        ],
                        collectionOrigins: [
                            {
                                start: {
                                    line: 24,
                                    character: 8
                                },
                                end: {
                                    line: 24,
                                    character: 19
                                }
                            },
                            {
                                start: {
                                    line: 25,
                                    character: 8
                                },
                                end: {
                                    line: 25,
                                    character: 28
                                }
                            }
                        ]
                    },
                    {
                        term: 'com.sap.vocabularies.Common.v1.SideEffects',
                        origin: {
                            start: {
                                line: 27,
                                character: 4
                            },
                            end: {
                                line: 42,
                                character: 5
                            }
                        },
                        qualifier: 'testse',
                        record: {
                            propertyValues: [
                                {
                                    name: 'SourceEntities',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                type: 'NavigationPropertyPath',
                                                NavigationPropertyPath: 'category/texts'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 30,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 30,
                                                    character: 26
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'SourceProperties',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'incidentStatus/name'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 33,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 33,
                                                    character: 31
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'TargetEntities',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                type: 'NavigationPropertyPath',
                                                NavigationPropertyPath: 'category'
                                            },
                                            {
                                                type: 'NavigationPropertyPath',
                                                NavigationPropertyPath: 'category/texts'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 36,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 36,
                                                    character: 20
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 37,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 37,
                                                    character: 26
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'TargetProperties',
                                    value: {
                                        type: 'Collection',
                                        Collection: ['assignedIndividual/addressID'],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 40,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 40,
                                                    character: 42
                                                }
                                            }
                                        ]
                                    }
                                }
                            ],
                            propertyValuesOrigins: [
                                {
                                    start: {
                                        line: 29,
                                        character: 8
                                    },
                                    end: {
                                        line: 31,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 32,
                                        character: 8
                                    },
                                    end: {
                                        line: 34,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 35,
                                        character: 8
                                    },
                                    end: {
                                        line: 38,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 39,
                                        character: 8
                                    },
                                    end: {
                                        line: 41,
                                        character: 9
                                    }
                                }
                            ],
                            type: 'com.sap.vocabularies.Common.v1.SideEffectsType'
                        }
                    },
                    {
                        term: 'com.sap.vocabularies.Common.v1.SideEffects',
                        origin: {
                            start: {
                                line: 43,
                                character: 4
                            },
                            end: {
                                line: 56,
                                character: 5
                            }
                        },
                        qualifier: 'CreatedAt',
                        record: {
                            propertyValues: [
                                {
                                    name: 'SourceProperties',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'incidentFlow/criticality'
                                            },
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'identifier'
                                            },
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'title'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 46,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 46,
                                                    character: 36
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 47,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 47,
                                                    character: 22
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 48,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 48,
                                                    character: 17
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'TargetProperties',
                                    value: {
                                        type: 'Collection',
                                        Collection: ['createdAt'],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 51,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 51,
                                                    character: 23
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'SourceEntities',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                type: 'NavigationPropertyPath',
                                                NavigationPropertyPath: 'category'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 54,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 54,
                                                    character: 20
                                                }
                                            }
                                        ]
                                    }
                                }
                            ],
                            propertyValuesOrigins: [
                                {
                                    start: {
                                        line: 45,
                                        character: 8
                                    },
                                    end: {
                                        line: 49,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 50,
                                        character: 8
                                    },
                                    end: {
                                        line: 52,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 53,
                                        character: 8
                                    },
                                    end: {
                                        line: 55,
                                        character: 9
                                    }
                                }
                            ],
                            type: 'com.sap.vocabularies.Common.v1.SideEffectsType'
                        }
                    },
                    {
                        term: 'com.sap.vocabularies.UI.v1.Chart',
                        origin: {
                            start: {
                                line: 57,
                                character: 4
                            },
                            end: {
                                line: 80,
                                character: 5
                            }
                        },
                        qualifier: 'bb',
                        record: {
                            propertyValues: [
                                {
                                    name: 'ChartType',
                                    value: {
                                        type: 'EnumMember',
                                        EnumMember: 'com.sap.vocabularies.UI.v1.ChartType/Bubble'
                                    }
                                },
                                {
                                    name: 'Dimensions',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'category_code'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 61,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 61,
                                                    character: 25
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'DimensionAttributes',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                propertyValues: [
                                                    {
                                                        name: 'Dimension',
                                                        value: {
                                                            type: 'PropertyPath',
                                                            PropertyPath: 'category_code'
                                                        }
                                                    },
                                                    {
                                                        name: 'Role',
                                                        value: {
                                                            type: 'EnumMember',
                                                            EnumMember:
                                                                'com.sap.vocabularies.UI.v1.ChartDimensionRoleType/Category'
                                                        }
                                                    }
                                                ],
                                                propertyValuesOrigins: [
                                                    {
                                                        start: {
                                                            line: 66,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 66,
                                                            character: 41
                                                        }
                                                    },
                                                    {
                                                        start: {
                                                            line: 67,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 67,
                                                            character: 32
                                                        }
                                                    }
                                                ],
                                                type: 'com.sap.vocabularies.UI.v1.ChartDimensionAttributeType'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 64,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 68,
                                                    character: 13
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'Measures',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'IncidentsPerCategory'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 71,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 71,
                                                    character: 32
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'MeasureAttributes',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                propertyValues: [
                                                    {
                                                        name: 'Measure',
                                                        value: {
                                                            type: 'PropertyPath',
                                                            PropertyPath: 'IncidentsPerCategory'
                                                        }
                                                    },
                                                    {
                                                        name: 'Role',
                                                        value: {
                                                            type: 'EnumMember',
                                                            EnumMember:
                                                                'com.sap.vocabularies.UI.v1.ChartMeasureRoleType/Axis1'
                                                        }
                                                    }
                                                ],
                                                propertyValuesOrigins: [
                                                    {
                                                        start: {
                                                            line: 76,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 76,
                                                            character: 46
                                                        }
                                                    },
                                                    {
                                                        start: {
                                                            line: 77,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 77,
                                                            character: 29
                                                        }
                                                    }
                                                ],
                                                type: 'com.sap.vocabularies.UI.v1.ChartMeasureAttributeType'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 74,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 78,
                                                    character: 13
                                                }
                                            }
                                        ]
                                    }
                                }
                            ],
                            propertyValuesOrigins: [
                                {
                                    start: {
                                        line: 59,
                                        character: 8
                                    },
                                    end: {
                                        line: 59,
                                        character: 27
                                    }
                                },
                                {
                                    start: {
                                        line: 60,
                                        character: 8
                                    },
                                    end: {
                                        line: 62,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 63,
                                        character: 8
                                    },
                                    end: {
                                        line: 69,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 70,
                                        character: 8
                                    },
                                    end: {
                                        line: 72,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 73,
                                        character: 8
                                    },
                                    end: {
                                        line: 79,
                                        character: 9
                                    }
                                }
                            ],
                            type: 'com.sap.vocabularies.UI.v1.ChartDefinitionType'
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 5,
                            character: 4
                        },
                        end: {
                            line: 22,
                            character: 5
                        }
                    },
                    {
                        start: {
                            line: 23,
                            character: 4
                        },
                        end: {
                            line: 26,
                            character: 5
                        }
                    },
                    {
                        start: {
                            line: 27,
                            character: 4
                        },
                        end: {
                            line: 42,
                            character: 5
                        }
                    },
                    {
                        start: {
                            line: 43,
                            character: 4
                        },
                        end: {
                            line: 56,
                            character: 5
                        }
                    },
                    {
                        start: {
                            line: 57,
                            character: 4
                        },
                        end: {
                            line: 80,
                            character: 5
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents/assignedIndividual',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.Common.v1.ValueList',
                        origin: {
                            start: {
                                line: 84,
                                character: 24
                            },
                            end: {
                                line: 102,
                                character: 5
                            }
                        },
                        record: {
                            propertyValues: [
                                {
                                    name: 'CollectionPath',
                                    value: {
                                        type: 'String',
                                        String: 'Individual'
                                    }
                                },
                                {
                                    name: 'Parameters',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                propertyValues: [
                                                    {
                                                        name: 'LocalDataProperty',
                                                        value: {
                                                            type: 'PropertyPath',
                                                            PropertyPath: 'assignedIndividual_id'
                                                        }
                                                    },
                                                    {
                                                        name: 'ValueListProperty',
                                                        value: {
                                                            type: 'String',
                                                            String: 'id'
                                                        }
                                                    }
                                                ],
                                                propertyValuesOrigins: [
                                                    {
                                                        start: {
                                                            line: 90,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 90,
                                                            character: 56
                                                        }
                                                    },
                                                    {
                                                        start: {
                                                            line: 91,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 91,
                                                            character: 39
                                                        }
                                                    }
                                                ],
                                                type: 'com.sap.vocabularies.Common.v1.ValueListParameterInOut'
                                            },
                                            {
                                                propertyValues: [
                                                    {
                                                        name: 'ValueListProperty',
                                                        value: {
                                                            type: 'String',
                                                            String: 'businessPartnerID'
                                                        }
                                                    }
                                                ],
                                                propertyValuesOrigins: [
                                                    {
                                                        start: {
                                                            line: 95,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 95,
                                                            character: 54
                                                        }
                                                    }
                                                ],
                                                type: 'com.sap.vocabularies.Common.v1.ValueListParameterDisplayOnly'
                                            },
                                            {
                                                propertyValues: [
                                                    {
                                                        name: 'ValueListProperty',
                                                        value: {
                                                            type: 'String',
                                                            String: 'addressID'
                                                        }
                                                    }
                                                ],
                                                propertyValuesOrigins: [
                                                    {
                                                        start: {
                                                            line: 99,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 99,
                                                            character: 46
                                                        }
                                                    }
                                                ],
                                                type: 'com.sap.vocabularies.Common.v1.ValueListParameterDisplayOnly'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 88,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 92,
                                                    character: 13
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 93,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 96,
                                                    character: 13
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 97,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 100,
                                                    character: 13
                                                }
                                            }
                                        ]
                                    }
                                }
                            ],
                            propertyValuesOrigins: [
                                {
                                    start: {
                                        line: 86,
                                        character: 8
                                    },
                                    end: {
                                        line: 86,
                                        character: 36
                                    }
                                },
                                {
                                    start: {
                                        line: 87,
                                        character: 8
                                    },
                                    end: {
                                        line: 101,
                                        character: 9
                                    }
                                }
                            ],
                            type: 'com.sap.vocabularies.Common.v1.ValueListType'
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 84,
                            character: 24
                        },
                        end: {
                            line: 102,
                            character: 5
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.UI.v1.SelectionPresentationVariant',
                        origin: {
                            start: {
                                line: 105,
                                character: 34
                            },
                            end: {
                                line: 116,
                                character: 1
                            }
                        },
                        qualifier: 'tableView',
                        record: {
                            propertyValues: [
                                {
                                    name: 'PresentationVariant',
                                    value: {
                                        type: 'Record',
                                        Record: {
                                            propertyValues: [
                                                {
                                                    name: 'Visualizations',
                                                    value: {
                                                        type: 'Collection',
                                                        Collection: [
                                                            {
                                                                type: 'AnnotationPath',
                                                                AnnotationPath: '@com.sap.vocabularies.UI.v1.LineItem'
                                                            }
                                                        ],
                                                        collectionOrigins: [
                                                            {
                                                                start: {
                                                                    line: 109,
                                                                    character: 25
                                                                },
                                                                end: {
                                                                    line: 109,
                                                                    character: 39
                                                                }
                                                            }
                                                        ]
                                                    }
                                                }
                                            ],
                                            propertyValuesOrigins: [
                                                {
                                                    start: {
                                                        line: 109,
                                                        character: 8
                                                    },
                                                    end: {
                                                        line: 109,
                                                        character: 42
                                                    }
                                                }
                                            ],
                                            type: 'com.sap.vocabularies.UI.v1.PresentationVariantType'
                                        }
                                    }
                                },
                                {
                                    name: 'SelectionVariant',
                                    value: {
                                        type: 'Record',
                                        Record: {
                                            propertyValues: [
                                                {
                                                    name: 'SelectOptions',
                                                    value: {
                                                        type: 'Collection',
                                                        Collection: [],
                                                        collectionOrigins: []
                                                    }
                                                }
                                            ],
                                            propertyValuesOrigins: [
                                                {
                                                    start: {
                                                        line: 113,
                                                        character: 8
                                                    },
                                                    end: {
                                                        line: 113,
                                                        character: 25
                                                    }
                                                }
                                            ],
                                            type: 'com.sap.vocabularies.UI.v1.SelectionVariantType'
                                        }
                                    }
                                },
                                {
                                    name: 'Text',
                                    value: {
                                        type: 'String',
                                        String: 'Table View'
                                    }
                                }
                            ],
                            propertyValuesOrigins: [
                                {
                                    start: {
                                        line: 107,
                                        character: 4
                                    },
                                    end: {
                                        line: 110,
                                        character: 5
                                    }
                                },
                                {
                                    start: {
                                        line: 111,
                                        character: 4
                                    },
                                    end: {
                                        line: 114,
                                        character: 5
                                    }
                                },
                                {
                                    start: {
                                        line: 115,
                                        character: 4
                                    },
                                    end: {
                                        line: 115,
                                        character: 37
                                    }
                                }
                            ],
                            type: 'com.sap.vocabularies.UI.v1.SelectionPresentationVariantType'
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 105,
                            character: 34
                        },
                        end: {
                            line: 116,
                            character: 1
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.UI.v1.Facets',
                        origin: {
                            start: {
                                line: 118,
                                character: 4
                            },
                            end: {
                                line: 131,
                                character: 5
                            }
                        },
                        collection: [
                            {
                                propertyValues: [
                                    {
                                        name: 'Label',
                                        value: {
                                            type: 'String',
                                            String: 'table section'
                                        }
                                    },
                                    {
                                        name: 'ID',
                                        value: {
                                            type: 'String',
                                            String: 'tablesection'
                                        }
                                    },
                                    {
                                        name: 'Target',
                                        value: {
                                            type: 'AnnotationPath',
                                            AnnotationPath:
                                                'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem#tablesection'
                                        }
                                    }
                                ],
                                propertyValuesOrigins: [
                                    {
                                        start: {
                                            line: 121,
                                            character: 12
                                        },
                                        end: {
                                            line: 121,
                                            character: 35
                                        }
                                    },
                                    {
                                        start: {
                                            line: 122,
                                            character: 12
                                        },
                                        end: {
                                            line: 122,
                                            character: 31
                                        }
                                    },
                                    {
                                        start: {
                                            line: 123,
                                            character: 12
                                        },
                                        end: {
                                            line: 123,
                                            character: 61
                                        }
                                    }
                                ],
                                type: 'com.sap.vocabularies.UI.v1.ReferenceFacet'
                            },
                            {
                                propertyValues: [
                                    {
                                        name: 'Label',
                                        value: {
                                            type: 'String',
                                            String: 'another table section'
                                        }
                                    },
                                    {
                                        name: 'ID',
                                        value: {
                                            type: 'String',
                                            String: 'anothertablesection'
                                        }
                                    },
                                    {
                                        name: 'Target',
                                        value: {
                                            type: 'AnnotationPath',
                                            AnnotationPath:
                                                'incidentProcessTimeline/@com.sap.vocabularies.UI.v1.LineItem#anothertablesection'
                                        }
                                    }
                                ],
                                propertyValuesOrigins: [
                                    {
                                        start: {
                                            line: 127,
                                            character: 12
                                        },
                                        end: {
                                            line: 127,
                                            character: 43
                                        }
                                    },
                                    {
                                        start: {
                                            line: 128,
                                            character: 12
                                        },
                                        end: {
                                            line: 128,
                                            character: 38
                                        }
                                    },
                                    {
                                        start: {
                                            line: 129,
                                            character: 12
                                        },
                                        end: {
                                            line: 129,
                                            character: 79
                                        }
                                    }
                                ],
                                type: 'com.sap.vocabularies.UI.v1.ReferenceFacet'
                            }
                        ],
                        collectionOrigins: [
                            {
                                start: {
                                    line: 119,
                                    character: 8
                                },
                                end: {
                                    line: 124,
                                    character: 9
                                }
                            },
                            {
                                start: {
                                    line: 125,
                                    character: 8
                                },
                                end: {
                                    line: 130,
                                    character: 9
                                }
                            }
                        ]
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 118,
                            character: 4
                        },
                        end: {
                            line: 131,
                            character: 5
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.IncidentFlow',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.UI.v1.LineItem',
                        origin: {
                            start: {
                                line: 134,
                                character: 4
                            },
                            end: {
                                line: 135,
                                character: 5
                            }
                        },
                        qualifier: 'tablesection',
                        collection: [],
                        collectionOrigins: []
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 134,
                            character: 4
                        },
                        end: {
                            line: 135,
                            character: 5
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.IncidentProcessTimeline',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.UI.v1.LineItem',
                        origin: {
                            start: {
                                line: 138,
                                character: 4
                            },
                            end: {
                                line: 139,
                                character: 5
                            }
                        },
                        qualifier: 'anothertablesection',
                        collection: [],
                        collectionOrigins: []
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 138,
                            character: 4
                        },
                        end: {
                            line: 139,
                            character: 5
                        }
                    }
                ]
            }
        ],
        './srv/common.cds': [
            {
                target: 'IncidentService.Incidents/ID',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.UI.v1.Hidden',
                        value: {
                            type: 'Bool',
                            Bool: true
                        },
                        origin: {
                            start: {
                                line: 17,
                                character: 8
                            },
                            end: {
                                line: 17,
                                character: 23
                            }
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 17,
                            character: 8
                        },
                        end: {
                            line: 17,
                            character: 23
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents/assignedIndividual',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.UI.v1.Hidden',
                        value: {
                            type: 'Bool',
                            Bool: true
                        },
                        origin: {
                            start: {
                                line: 18,
                                character: 24
                            },
                            end: {
                                line: 18,
                                character: 40
                            }
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 18,
                            character: 24
                        },
                        end: {
                            line: 18,
                            character: 40
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents/incidentStatus',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.Common.v1.ValueListWithFixedValues',
                        value: undefined,
                        origin: {
                            start: {
                                line: 23,
                                character: 8
                            },
                            end: {
                                line: 23,
                                character: 32
                            }
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 23,
                            character: 8
                        },
                        end: {
                            line: 23,
                            character: 32
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents/category',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.Common.v1.ValueListWithFixedValues',
                        value: undefined,
                        origin: {
                            start: {
                                line: 26,
                                character: 8
                            },
                            end: {
                                line: 26,
                                character: 32
                            }
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 26,
                            character: 8
                        },
                        end: {
                            line: 26,
                            character: 32
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents/priority',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.Common.v1.ValueListWithFixedValues',
                        value: undefined,
                        origin: {
                            start: {
                                line: 29,
                                character: 8
                            },
                            end: {
                                line: 29,
                                character: 32
                            }
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 29,
                            character: 8
                        },
                        end: {
                            line: 29,
                            character: 32
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Category/code',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.Common.v1.Text',
                        value: {
                            type: 'Path',
                            Path: 'name'
                        },
                        origin: {
                            start: {
                                line: 35,
                                character: 8
                            },
                            end: {
                                line: 35,
                                character: 30
                            }
                        }
                    },
                    {
                        term: 'com.sap.vocabularies.Common.v1.TextArrangement',
                        value: {
                            type: 'EnumMember',
                            EnumMember: 'com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly'
                        },
                        origin: {
                            start: {
                                line: 36,
                                character: 8
                            },
                            end: {
                                line: 36,
                                character: 35
                            }
                        }
                    },
                    {
                        term: 'title',
                        value: {
                            type: 'String',
                            String: '{i18n>Category}'
                        },
                        origin: {
                            start: {
                                line: 37,
                                character: 10
                            },
                            end: {
                                line: 37,
                                character: 36
                            }
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 35,
                            character: 8
                        },
                        end: {
                            line: 35,
                            character: 30
                        }
                    },
                    {
                        start: {
                            line: 36,
                            character: 8
                        },
                        end: {
                            line: 36,
                            character: 35
                        }
                    },
                    {
                        start: {
                            line: 37,
                            character: 10
                        },
                        end: {
                            line: 37,
                            character: 36
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Priority/code',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.Common.v1.Text',
                        value: {
                            type: 'Path',
                            Path: 'name'
                        },
                        origin: {
                            start: {
                                line: 42,
                                character: 8
                            },
                            end: {
                                line: 42,
                                character: 30
                            }
                        }
                    },
                    {
                        term: 'com.sap.vocabularies.Common.v1.TextArrangement',
                        value: {
                            type: 'EnumMember',
                            EnumMember: 'com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly'
                        },
                        origin: {
                            start: {
                                line: 43,
                                character: 8
                            },
                            end: {
                                line: 43,
                                character: 35
                            }
                        }
                    },
                    {
                        term: 'title',
                        value: {
                            type: 'String',
                            String: '{i18n>Priority}'
                        },
                        origin: {
                            start: {
                                line: 44,
                                character: 10
                            },
                            end: {
                                line: 44,
                                character: 36
                            }
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 42,
                            character: 8
                        },
                        end: {
                            line: 42,
                            character: 30
                        }
                    },
                    {
                        start: {
                            line: 43,
                            character: 8
                        },
                        end: {
                            line: 43,
                            character: 35
                        }
                    },
                    {
                        start: {
                            line: 44,
                            character: 10
                        },
                        end: {
                            line: 44,
                            character: 36
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.IncidentStatus/code',
                annotations: [
                    {
                        term: 'com.sap.vocabularies.Common.v1.Text',
                        value: {
                            type: 'Path',
                            Path: 'name'
                        },
                        origin: {
                            start: {
                                line: 49,
                                character: 8
                            },
                            end: {
                                line: 49,
                                character: 30
                            }
                        }
                    },
                    {
                        term: 'com.sap.vocabularies.Common.v1.TextArrangement',
                        value: {
                            type: 'EnumMember',
                            EnumMember: 'com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly'
                        },
                        origin: {
                            start: {
                                line: 50,
                                character: 8
                            },
                            end: {
                                line: 50,
                                character: 35
                            }
                        }
                    },
                    {
                        term: 'title',
                        value: {
                            type: 'String',
                            String: '{i18n>IncidentStatus}'
                        },
                        origin: {
                            start: {
                                line: 51,
                                character: 10
                            },
                            end: {
                                line: 51,
                                character: 42
                            }
                        }
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 49,
                            character: 8
                        },
                        end: {
                            line: 49,
                            character: 30
                        }
                    },
                    {
                        start: {
                            line: 50,
                            character: 8
                        },
                        end: {
                            line: 50,
                            character: 35
                        }
                    },
                    {
                        start: {
                            line: 51,
                            character: 10
                        },
                        end: {
                            line: 51,
                            character: 42
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents',
                annotations: [
                    {
                        term: 'Org.OData.Aggregation.V1.ApplySupported',
                        origin: {
                            start: {
                                line: 55,
                                character: 4
                            },
                            end: {
                                line: 83,
                                character: 5
                            }
                        },
                        record: {
                            propertyValues: [
                                {
                                    name: 'Transformations',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            'aggregate',
                                            'topcount',
                                            'bottomcount',
                                            'identity',
                                            'concat',
                                            'groupby',
                                            'filter',
                                            'expand',
                                            'top',
                                            'skip',
                                            'orderby',
                                            'search'
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 58,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 58,
                                                    character: 23
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 59,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 59,
                                                    character: 22
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 60,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 60,
                                                    character: 25
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 61,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 61,
                                                    character: 22
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 62,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 62,
                                                    character: 20
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 63,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 63,
                                                    character: 21
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 64,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 64,
                                                    character: 20
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 65,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 65,
                                                    character: 20
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 66,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 66,
                                                    character: 17
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 67,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 67,
                                                    character: 18
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 68,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 68,
                                                    character: 21
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 69,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 69,
                                                    character: 20
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'GroupableProperties',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'category_code'
                                            },
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'priority_code'
                                            },
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'incidentStatus_code'
                                            },
                                            {
                                                type: 'PropertyPath',
                                                PropertyPath: 'title'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 72,
                                                    character: 8
                                                },
                                                end: {
                                                    line: 72,
                                                    character: 21
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 73,
                                                    character: 8
                                                },
                                                end: {
                                                    line: 73,
                                                    character: 21
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 74,
                                                    character: 8
                                                },
                                                end: {
                                                    line: 74,
                                                    character: 27
                                                }
                                            },
                                            {
                                                start: {
                                                    line: 75,
                                                    character: 8
                                                },
                                                end: {
                                                    line: 75,
                                                    character: 13
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'AggregatableProperties',
                                    value: {
                                        type: 'Collection',
                                        Collection: [
                                            {
                                                propertyValues: [
                                                    {
                                                        name: 'Property',
                                                        value: {
                                                            type: 'PropertyPath',
                                                            PropertyPath: 'ID'
                                                        }
                                                    }
                                                ],
                                                propertyValuesOrigins: [
                                                    {
                                                        start: {
                                                            line: 80,
                                                            character: 16
                                                        },
                                                        end: {
                                                            line: 80,
                                                            character: 29
                                                        }
                                                    }
                                                ],
                                                type: 'Org.OData.Aggregation.V1.AggregatablePropertyType'
                                            }
                                        ],
                                        collectionOrigins: [
                                            {
                                                start: {
                                                    line: 78,
                                                    character: 12
                                                },
                                                end: {
                                                    line: 81,
                                                    character: 13
                                                }
                                            }
                                        ]
                                    }
                                }
                            ],
                            propertyValuesOrigins: [
                                {
                                    start: {
                                        line: 57,
                                        character: 8
                                    },
                                    end: {
                                        line: 70,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 71,
                                        character: 8
                                    },
                                    end: {
                                        line: 76,
                                        character: 9
                                    }
                                },
                                {
                                    start: {
                                        line: 77,
                                        character: 8
                                    },
                                    end: {
                                        line: 82,
                                        character: 9
                                    }
                                }
                            ],
                            type: 'Org.OData.Aggregation.V1.ApplySupportedType'
                        }
                    },
                    {
                        term: 'com.sap.vocabularies.Analytics.v1.AggregatedProperties',
                        origin: {
                            start: {
                                line: 84,
                                character: 4
                            },
                            end: {
                                line: 89,
                                character: 6
                            }
                        },
                        collection: [
                            {
                                propertyValues: [
                                    {
                                        name: 'Name',
                                        value: {
                                            type: 'String',
                                            String: 'IncidentsPerCategory'
                                        }
                                    },
                                    {
                                        name: 'AggregationMethod',
                                        value: {
                                            type: 'String',
                                            String: 'countdistinct'
                                        }
                                    },
                                    {
                                        name: 'AggregatableProperty',
                                        value: {
                                            type: 'PropertyPath',
                                            PropertyPath: 'ID'
                                        }
                                    }
                                ],
                                propertyValuesOrigins: [
                                    {
                                        start: {
                                            line: 85,
                                            character: 8
                                        },
                                        end: {
                                            line: 85,
                                            character: 53
                                        }
                                    },
                                    {
                                        start: {
                                            line: 86,
                                            character: 8
                                        },
                                        end: {
                                            line: 86,
                                            character: 46
                                        }
                                    },
                                    {
                                        start: {
                                            line: 87,
                                            character: 8
                                        },
                                        end: {
                                            line: 87,
                                            character: 33
                                        }
                                    }
                                ],
                                annotations: [
                                    {
                                        term: 'com.sap.vocabularies.Common.v1.Label',
                                        value: {
                                            type: 'String',
                                            String: '{i18n>IncidentsPerCategory}'
                                        },
                                        origin: {
                                            start: {
                                                line: 88,
                                                character: 8
                                            },
                                            end: {
                                                line: 88,
                                                character: 60
                                            }
                                        }
                                    }
                                ]
                            }
                        ],
                        collectionOrigins: [
                            {
                                start: {
                                    line: 84,
                                    character: 38
                                },
                                end: {
                                    line: 89,
                                    character: 5
                                }
                            }
                        ]
                    }
                ],
                origins: [
                    {
                        start: {
                            line: 55,
                            character: 4
                        },
                        end: {
                            line: 83,
                            character: 5
                        }
                    },
                    {
                        start: {
                            line: 84,
                            character: 4
                        },
                        end: {
                            line: 89,
                            character: 6
                        }
                    }
                ]
            }
        ]
    },
    entitySets: [
        {
            _type: 'EntitySet',
            name: 'Incidents',
            entityTypeName: 'IncidentService.Incidents',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/Incidents'
        },
        {
            _type: 'EntitySet',
            name: 'IncidentFlow',
            entityTypeName: 'IncidentService.IncidentFlow',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/IncidentFlow'
        },
        {
            _type: 'EntitySet',
            name: 'IncidentProcessTimeline',
            entityTypeName: 'IncidentService.IncidentProcessTimeline',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/IncidentProcessTimeline'
        },
        {
            _type: 'EntitySet',
            name: 'ProcessingThreshold',
            entityTypeName: 'IncidentService.ProcessingThreshold',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/ProcessingThreshold'
        },
        {
            _type: 'EntitySet',
            name: 'Individual',
            entityTypeName: 'IncidentService.Individual',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/Individual'
        },
        {
            _type: 'EntitySet',
            name: 'Category',
            entityTypeName: 'IncidentService.Category',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/Category'
        },
        {
            _type: 'EntitySet',
            name: 'Priority',
            entityTypeName: 'IncidentService.Priority',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/Priority'
        },
        {
            _type: 'EntitySet',
            name: 'IncidentStatus',
            entityTypeName: 'IncidentService.IncidentStatus',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/IncidentStatus'
        },
        {
            _type: 'EntitySet',
            name: 'Category_texts',
            entityTypeName: 'IncidentService.Category_texts',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/Category_texts'
        },
        {
            _type: 'EntitySet',
            name: 'Priority_texts',
            entityTypeName: 'IncidentService.Priority_texts',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/Priority_texts'
        },
        {
            _type: 'EntitySet',
            name: 'IncidentStatus_texts',
            entityTypeName: 'IncidentService.IncidentStatus_texts',
            navigationPropertyBinding: {},
            fullyQualifiedName: 'IncidentService.EntityContainer/IncidentStatus_texts'
        }
    ],
    complexTypes: [],
    entityContainer: {
        _type: 'EntityContainer',
        name: 'EntityContainer',
        fullyQualifiedName: 'IncidentService.EntityContainer'
    },
    actions: [],
    entityTypes: [
        {
            _type: 'EntityType',
            name: 'IncidentService.Incidents',
            fullyQualifiedName: 'IncidentService.Incidents',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'createdAt',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.Incidents/createdAt'
                },
                {
                    _type: 'Property',
                    name: 'createdBy',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Incidents/createdBy'
                },
                {
                    _type: 'Property',
                    name: 'modifiedAt',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.Incidents/modifiedAt'
                },
                {
                    _type: 'Property',
                    name: 'modifiedBy',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Incidents/modifiedBy'
                },
                {
                    _type: 'Property',
                    name: 'ID',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.Incidents/ID'
                },
                {
                    _type: 'Property',
                    name: 'identifier',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Incidents/identifier'
                },
                {
                    _type: 'Property',
                    name: 'title',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Incidents/title'
                },
                {
                    _type: 'Property',
                    name: 'category_code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Incidents/category_code'
                },
                {
                    _type: 'Property',
                    name: 'priority_code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Incidents/priority_code'
                },
                {
                    _type: 'Property',
                    name: 'incidentStatus_code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Incidents/incidentStatus_code'
                },
                {
                    _type: 'Property',
                    name: 'description',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Incidents/description'
                },
                {
                    _type: 'Property',
                    name: 'assignedIndividual_id',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.Incidents/assignedIndividual_id'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'ID',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.Incidents/ID'
                }
            ],
            navigationProperties: [
                {
                    _type: 'NavigationProperty',
                    name: 'category',
                    fullyQualifiedName: 'IncidentService.Incidents/category',
                    targetTypeName: 'IncidentService.Category',
                    isCollection: false,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                },
                {
                    _type: 'NavigationProperty',
                    name: 'priority',
                    fullyQualifiedName: 'IncidentService.Incidents/priority',
                    targetTypeName: 'IncidentService.Priority',
                    isCollection: false,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                },
                {
                    _type: 'NavigationProperty',
                    name: 'incidentStatus',
                    fullyQualifiedName: 'IncidentService.Incidents/incidentStatus',
                    targetTypeName: 'IncidentService.IncidentStatus',
                    isCollection: false,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                },
                {
                    _type: 'NavigationProperty',
                    name: 'assignedIndividual',
                    fullyQualifiedName: 'IncidentService.Incidents/assignedIndividual',
                    targetTypeName: 'IncidentService.Individual',
                    isCollection: false,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                },
                {
                    _type: 'NavigationProperty',
                    name: 'incidentFlow',
                    fullyQualifiedName: 'IncidentService.Incidents/incidentFlow',
                    targetTypeName: 'IncidentService.IncidentFlow',
                    isCollection: true,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                },
                {
                    _type: 'NavigationProperty',
                    name: 'incidentProcessTimeline',
                    fullyQualifiedName: 'IncidentService.Incidents/incidentProcessTimeline',
                    targetTypeName: 'IncidentService.IncidentProcessTimeline',
                    isCollection: true,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                },
                {
                    _type: 'NavigationProperty',
                    name: 'processingThreshold',
                    fullyQualifiedName: 'IncidentService.Incidents/processingThreshold',
                    targetTypeName: 'IncidentService.ProcessingThreshold',
                    isCollection: false,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                }
            ],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.IncidentFlow',
            fullyQualifiedName: 'IncidentService.IncidentFlow',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'createdAt',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/createdAt'
                },
                {
                    _type: 'Property',
                    name: 'createdBy',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/createdBy'
                },
                {
                    _type: 'Property',
                    name: 'modifiedAt',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/modifiedAt'
                },
                {
                    _type: 'Property',
                    name: 'modifiedBy',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/modifiedBy'
                },
                {
                    _type: 'Property',
                    name: 'id',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/id'
                },
                {
                    _type: 'Property',
                    name: 'processStep',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/processStep'
                },
                {
                    _type: 'Property',
                    name: 'stepStatus',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/stepStatus'
                },
                {
                    _type: 'Property',
                    name: 'criticality',
                    type: 'Edm.Int32',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/criticality'
                },
                {
                    _type: 'Property',
                    name: 'stepStartDate',
                    type: 'Edm.Date',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/stepStartDate'
                },
                {
                    _type: 'Property',
                    name: 'stepEndDate',
                    type: 'Edm.Date',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/stepEndDate'
                },
                {
                    _type: 'Property',
                    name: 'incident_ID',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/incident_ID'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'id',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/id'
                }
            ],
            navigationProperties: [
                {
                    _type: 'NavigationProperty',
                    name: 'incident',
                    fullyQualifiedName: 'IncidentService.IncidentFlow/incident',
                    targetTypeName: 'IncidentService.Incidents',
                    isCollection: false,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                }
            ],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.IncidentProcessTimeline',
            fullyQualifiedName: 'IncidentService.IncidentProcessTimeline',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'createdAt',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/createdAt'
                },
                {
                    _type: 'Property',
                    name: 'createdBy',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/createdBy'
                },
                {
                    _type: 'Property',
                    name: 'modifiedAt',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/modifiedAt'
                },
                {
                    _type: 'Property',
                    name: 'modifiedBy',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/modifiedBy'
                },
                {
                    _type: 'Property',
                    name: 'id',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/id'
                },
                {
                    _type: 'Property',
                    name: 'text',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/text'
                },
                {
                    _type: 'Property',
                    name: 'type',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/type'
                },
                {
                    _type: 'Property',
                    name: 'startTime',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/startTime'
                },
                {
                    _type: 'Property',
                    name: 'endTime',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/endTime'
                },
                {
                    _type: 'Property',
                    name: 'incident_ID',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/incident_ID'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'id',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/id'
                }
            ],
            navigationProperties: [
                {
                    _type: 'NavigationProperty',
                    name: 'incident',
                    fullyQualifiedName: 'IncidentService.IncidentProcessTimeline/incident',
                    targetTypeName: 'IncidentService.Incidents',
                    isCollection: false,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                }
            ],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.ProcessingThreshold',
            fullyQualifiedName: 'IncidentService.ProcessingThreshold',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'id',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.ProcessingThreshold/id'
                },
                {
                    _type: 'Property',
                    name: 'processingDays',
                    type: 'Edm.Int32',
                    fullyQualifiedName: 'IncidentService.ProcessingThreshold/processingDays'
                },
                {
                    _type: 'Property',
                    name: 'processingLimit',
                    type: 'Edm.Int32',
                    fullyQualifiedName: 'IncidentService.ProcessingThreshold/processingLimit'
                },
                {
                    _type: 'Property',
                    name: 'incident_ID',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.ProcessingThreshold/incident_ID'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'id',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.ProcessingThreshold/id'
                }
            ],
            navigationProperties: [
                {
                    _type: 'NavigationProperty',
                    name: 'incident',
                    fullyQualifiedName: 'IncidentService.ProcessingThreshold/incident',
                    targetTypeName: 'IncidentService.Incidents',
                    isCollection: false,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                }
            ],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.Individual',
            fullyQualifiedName: 'IncidentService.Individual',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'createdAt',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.Individual/createdAt'
                },
                {
                    _type: 'Property',
                    name: 'createdBy',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Individual/createdBy'
                },
                {
                    _type: 'Property',
                    name: 'modifiedAt',
                    type: 'Edm.DateTimeOffset',
                    fullyQualifiedName: 'IncidentService.Individual/modifiedAt'
                },
                {
                    _type: 'Property',
                    name: 'modifiedBy',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Individual/modifiedBy'
                },
                {
                    _type: 'Property',
                    name: 'id',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.Individual/id'
                },
                {
                    _type: 'Property',
                    name: 'businessPartnerID',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Individual/businessPartnerID'
                },
                {
                    _type: 'Property',
                    name: 'addressID',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Individual/addressID'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'id',
                    type: 'Edm.Guid',
                    fullyQualifiedName: 'IncidentService.Individual/id'
                }
            ],
            navigationProperties: [
                {
                    _type: 'NavigationProperty',
                    name: 'Incidents',
                    fullyQualifiedName: 'IncidentService.Individual/Incidents',
                    targetTypeName: 'IncidentService.Incidents',
                    isCollection: true,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                }
            ],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.Category',
            fullyQualifiedName: 'IncidentService.Category',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'name',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category/name'
                },
                {
                    _type: 'Property',
                    name: 'descr',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category/descr'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category/code'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category/code'
                }
            ],
            navigationProperties: [
                {
                    _type: 'NavigationProperty',
                    name: 'texts',
                    fullyQualifiedName: 'IncidentService.Category/texts',
                    targetTypeName: 'IncidentService.Category_texts',
                    isCollection: true,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                }
            ],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.Priority',
            fullyQualifiedName: 'IncidentService.Priority',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'name',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority/name'
                },
                {
                    _type: 'Property',
                    name: 'descr',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority/descr'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority/code'
                },
                {
                    _type: 'Property',
                    name: 'criticality',
                    type: 'Edm.Int32',
                    fullyQualifiedName: 'IncidentService.Priority/criticality'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority/code'
                }
            ],
            navigationProperties: [
                {
                    _type: 'NavigationProperty',
                    name: 'texts',
                    fullyQualifiedName: 'IncidentService.Priority/texts',
                    targetTypeName: 'IncidentService.Priority_texts',
                    isCollection: true,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                }
            ],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.IncidentStatus',
            fullyQualifiedName: 'IncidentService.IncidentStatus',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'name',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus/name'
                },
                {
                    _type: 'Property',
                    name: 'descr',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus/descr'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus/code'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus/code'
                }
            ],
            navigationProperties: [
                {
                    _type: 'NavigationProperty',
                    name: 'texts',
                    fullyQualifiedName: 'IncidentService.IncidentStatus/texts',
                    targetTypeName: 'IncidentService.IncidentStatus_texts',
                    isCollection: true,
                    containsTarget: false,
                    partner: '',
                    referentialConstraint: []
                }
            ],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.Category_texts',
            fullyQualifiedName: 'IncidentService.Category_texts',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'locale',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category_texts/locale'
                },
                {
                    _type: 'Property',
                    name: 'name',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category_texts/name'
                },
                {
                    _type: 'Property',
                    name: 'descr',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category_texts/descr'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category_texts/code'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'locale',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category_texts/locale'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Category_texts/code'
                }
            ],
            navigationProperties: [],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.Priority_texts',
            fullyQualifiedName: 'IncidentService.Priority_texts',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'locale',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority_texts/locale'
                },
                {
                    _type: 'Property',
                    name: 'name',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority_texts/name'
                },
                {
                    _type: 'Property',
                    name: 'descr',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority_texts/descr'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority_texts/code'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'locale',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority_texts/locale'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.Priority_texts/code'
                }
            ],
            navigationProperties: [],
            actions: {}
        },
        {
            _type: 'EntityType',
            name: 'IncidentService.IncidentStatus_texts',
            fullyQualifiedName: 'IncidentService.IncidentStatus_texts',
            entityProperties: [
                {
                    _type: 'Property',
                    name: 'locale',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus_texts/locale'
                },
                {
                    _type: 'Property',
                    name: 'name',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus_texts/name'
                },
                {
                    _type: 'Property',
                    name: 'descr',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus_texts/descr'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus_texts/code'
                }
            ],
            keys: [
                {
                    _type: 'Property',
                    name: 'locale',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus_texts/locale'
                },
                {
                    _type: 'Property',
                    name: 'code',
                    type: 'Edm.String',
                    fullyQualifiedName: 'IncidentService.IncidentStatus_texts/code'
                }
            ],
            navigationProperties: [],
            actions: {}
        }
    ],
    actionImports: [],
    associations: [],
    singletons: [],
    associationSets: [],
    typeDefinitions: []
};
