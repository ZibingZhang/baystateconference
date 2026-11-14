---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: sport-home
title: Swimming & Diving
---
{% include icon-link.html icon="calendar_month" label="Schedule" url="/sports/swimming-diving/schedule/current-season/" %}

{% include icon-link.html icon="emoji_events" label="Meets" url="/sports/swimming-diving/meets/" %}

{%- if page.current_school_year_url %}
{% include icon-link.html icon="checklist" label="Qualifying Standards" url=page.current_school_year_url %}
{%- endif %}

{% include icon-link.html icon="military_tech" label="Records" url="/sports/swimming-diving/records/" %}

{% include icon-link.html icon="archive" label="Archive" url="/sports/swimming-diving/archive/" %}
