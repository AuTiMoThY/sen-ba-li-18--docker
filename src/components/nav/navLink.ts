interface NavItem {
    name: string;
    zhName: string;
    child?: {
        zhName: string;
        pathName: string;
    }[];
    pathName?: string;
    url?: string;
}
export const navLink: NavItem[] = [
    {
        name: "LOCATION",
        zhName: "優質地段",
        // pathName: "location-1",
        child: [
            {
                pathName: "location-1",
                zhName: "大溪願景"
            },
            {
                pathName: "location-2",
                zhName: "生活機能"
            }
        ]
    },
    {
        name: "TEAM",
        zhName: "建築團隊",
        // pathName: "team-1",
        child: [
            {
                pathName: "team-1",
                zhName: "名尚建設"
            },
            {
                pathName: "team-2",
                zhName: "大師團隊"
            }
        ]
    },
    {
        name: "BUILDING",
        zhName: "匠心建築",
        pathName: "building",
    },
    {
        name: "METHOD",
        zhName: "極選工藝",
        // pathName: "method-1",
        child: [
            {
                pathName: "method-1",
                zhName: "精品美學"
            },
            {
                pathName: "method-2",
                zhName: "建築工藝"
            }
        ]
    },

];
