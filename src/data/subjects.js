// What each image shows, tagged by hand from its title and the image itself.
// Archive categories alone can't tell a portrait from a landscape.
const TAGS = {
  portrait: 'y58 y55 y38 y27 y9 y208 y196 y225 l22 l23 l24 l26 l28 l49 l59 l62 l66 l82 l21 l111 l123 l131 l144 l152 l188 l110 fdc0a85 fb379a8 f4c96ba',
  people: 'h55 l12 l35 l30 l43 l44 l46 l72 l74 l25 l42 l50 l52 l55 l56 l58 l64 l70 y4 y186 y187 y198 y222 l122 l132 l143 fbdb72e f96dcc8 f8a174f',
  landscape: 'h46 h47 l0 l1 l4 l13 l14 l19 l27 l33 l51 l57 l68 l69 l76 y178 y206 y210 l109 l120 l129 l181 l192 l130 f0c7cfe fe677cb f7a13da',
  interiors: 'h51 l20 l78 y8 l163 l161 l164 y217 y218 y219',
  architecture: 'h86 h87 h89 h93 l2 l3 l29 l32 l34 l40 l48 l53 l54 l65 l67 l73 l75 l79 l81 l83 l84 l85 l86 l87 l88 l89 l90 l91 l92 l94 l95 l96 l97 l154 l200 f9154d8 fa6fa55 fd3b4fa facef25',
  art: 'l77 l142 l151 l153 l162 l171 l172 f310f47 f5f0dd6 f4b54f5',
};

export const SUBJECT_BY_ID = {};
Object.entries(TAGS).forEach(([subject, ids]) => ids.split(' ').forEach((id) => { SUBJECT_BY_ID[id] = subject; }));

// Second-best matches once a subject's own images run out.
export const RELATED_SUBJECTS = {
  portrait: ['people'],
  people: ['portrait'],
  landscape: ['art'],
  interiors: ['architecture'],
  architecture: ['interiors'],
  art: ['typography'],
  typography: ['documents', 'art'],
  documents: ['typography'],
};

// The same photo appears twice in the sample under different records.
export const DUPLICATE_OF = { l17: 'h46', l18: 'h47' };
