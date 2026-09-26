export const GITHUB_REPOSITORY='https://github.com/lanekingsbery/open-task-relay-public';
export const GITHUB_ISSUES=GITHUB_REPOSITORY+'/issues';
export const GITHUB_SECURITY_POLICY=GITHUB_REPOSITORY+'/blob/main/SECURITY.md';
export const GITHUB_SECURITY=GITHUB_REPOSITORY+'/security';
export const GITHUB_LICENSE=GITHUB_REPOSITORY+'/blob/main/LICENSE';
export const GITHUB_ACTIONS=GITHUB_REPOSITORY+'/actions';
export const ZENODO_RECORD='https://zenodo.org/records/22636841';
export const VERSION_DOI_NUMBER='10.5281/zenodo.22636841';
export const VERSION_DOI='https://doi.org/10.5281/zenodo.22636841';
export const ALL_VERSIONS_DOI='https://doi.org/10.5281/zenodo.22636840';
export const CREATOR_ORCID='https://orcid.org/0009-0002-1431-9760';
export const RELEASE_CITATION='Kingsbery, L. (2026). Open Task Relay (Version v1.0.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.22636841';
export const GITHUB_WORKFLOW=GITHUB_REPOSITORY+'/actions/workflows/ci.yml';
export const GITHUB_CHECK_BADGE=GITHUB_WORKFLOW+'/badge.svg?branch=main&event=push';

// Public provider records checked 2026-09-20. Status belongs to the provider;
// do not add pending submissions or replace provider badges with custom scores.
export const MCP_REGISTRY_NAME='org.opentaskrelay/open-task-relay';
export const MCP_REGISTRY_RECORD='https://registry.modelcontextprotocol.io/v0.1/servers/'+encodeURIComponent(MCP_REGISTRY_NAME)+'/versions/latest';
export type DiscoveryListing={name:string;url:string;description:string;badge?:{src:string;alt:string;width:number;height:number}};
export const DISCOVERY_LISTINGS:DiscoveryListing[]=[
 {name:'Global A2A Registry',url:'https://www.a2a-registry.org/agent/org.opentaskrelay.open_task_relay',description:'A2A agent listing.',badge:{src:'https://www.a2a-registry.org/badges/verified-badge-light.svg',alt:'Open Task Relay — verified on Global A2A Registry',width:180,height:40}},
 {name:'Awesome Agent-Native Services',url:'https://github.com/haoruilee/awesome-agent-native-services/blob/main/services/agent-social-network/open-task-relay.md',description:'Curated agent-native service catalog.'},
 {name:'A2A Directory',url:'https://github.com/sing1ee/a2a-directory',description:'Listed as an A2A agent and tool.'},
 {name:'Smithery',url:'https://smithery.ai/servers/kingsbery-careers/open-task-relay',description:'MCP discovery listing.'},
 {name:'Glama',url:'https://glama.ai/mcp/connectors/org.opentaskrelay/open-task-relay',description:'MCP connector listing.',badge:{src:'https://glama.ai/mcp/connectors/org.opentaskrelay/open-task-relay/badges/score.svg',alt:'Glama score and endpoint status for the Open Task Relay MCP connector',width:110,height:20}},
 {name:'mcpservers.org',url:'https://mcpservers.org/servers/opentaskrelay-org',description:'MCP directory listing.'},
 {name:'FastDrop',url:'https://fastdrop.dev/u/open-task-relay',description:'Maker profile and MCP launch.'},
 {name:'Official MCP Registry',url:MCP_REGISTRY_RECORD,description:'Active remote MCP listing.'},
];

// Exact external-resource destinations from Zenodo record 22636841, checked
// 2026-09-07. Preserve every field in the qualified Software Heritage URL.
export const OPENAIRE_RECORD='https://explore.openaire.eu/search/result?pid=10.5281/zenodo.22636841';
export const SOFTWARE_HERITAGE_RECORD='https://archive.softwareheritage.org/swh:1:dir:ffce93620d271fda5a988d77dc7d2baf4e7e13b9;origin=https://doi.org/10.5281/zenodo.22636840;visit=swh:1:snp:4240d52d125d317b84b1d2bf32ad8299f24fe304;anchor=swh:1:rel:535fd5e11773de075564291efba484993bae08fa;path=lanekingsbery-open-task-relay-3a2f80d';
