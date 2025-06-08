export interface Area {
    act:              number;
    area_level:       number;
    area_mods:        string[];
    area_type_tags?:  string[];
    bosses:           string[];
    connections:      string[];
    environment?:     string;
    has_waypoint:     boolean;
    id:               string;
    is_town:          boolean;
    loading_screens:  string[];
    name:             string;
    packs?:           Pack[];
    parent_town?:     string;
    tags:             string[];
    terrain_plugins?: string;
    topologies?:      Topology[];
}

export interface Pack {
    additional_monsters?:       { [key: string]: AdditionalMonster };
    boss_chance:                number;
    boss_count:                 number;
    boss_monster_spawn_chance?: number;
    boss_monsters:              string[];
    formation?:                 string;
    id:                         string;
    max_count:                  number;
    min_count:                  number;
    monsters:                   { [key: string]: Monster };
    tags:                       string[];
}

export interface AdditionalMonster {
    count: number;
}

export interface Monster {
    flag:   boolean;
    weight: number;
}

export interface Topology {
    file: string;
    id:   string;
    [property: string]: any;
}
