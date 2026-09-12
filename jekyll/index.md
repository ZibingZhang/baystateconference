---
layout: page
title: Bay State Conference
permalink: /
home_cards:
  - title: Schools
    icon: school
    url: /schools/
  - title: Sports
    icon: sports
    url: /sports/
  - title: Schedules
    icon: calendar_month
    url: /schedules/
---

{% include todays-games.html %}

{% include home-cards.html items=page.home_cards %}
