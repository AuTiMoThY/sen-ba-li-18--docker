import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: "/",
            name: "home",
            component: () => import("@/views/home/HomePage.vue")
        },
        {
            path: "/location",
            name: "location",
            component: () => import("@/views/location/MainPage.vue"),
            children: [
                {
                    path: "",
                    name: "location-1",
                    component: () => import("@/views/location/Location1Page.vue")
                },
                {
                    path: "location-2",
                    name: "location-2",
                    component: () => import("@/views/location/Location2Page.vue")
                }
            ]
        },
        {
            path: "/team",
            name: "team",
            component: () => import("@/views/team/MainPage.vue"),
            children: [
                {
                    path: "",
                    name: "team-1",
                    component: () => import("@/views/team/Team1Page.vue")
                },
                {
                    path: "team-2",
                    name: "team-2",
                    component: () => import("@/views/team/Team2Page.vue")
                }
            ]
        },
        {
            path: "/building",
            name: "building",
            component: () => import("@/views/building/MainPage.vue"),

        },
        {
            path: "/building/floor",
            name: "building-floor",
            component: () => import("@/views/building/FloorPage.vue")
        },
        {
            path: "/method",
            name: "method",
            component: () => import("@/views/method/MainPage.vue"),
            children: [
                {
                    path: "",
                    name: "method-1",
                    component: () => import("@/views/method/Method1Page.vue")
                },
                {
                    path: "method-2",
                    name: "method-2",
                    component: () => import("@/views/method/Method2Page.vue")
                }
            ]
        },

    ]
});

export default router;
