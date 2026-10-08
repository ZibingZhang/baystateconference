# Liquid filter: percent-encodes a string for safe use as one
# application/x-www-form-urlencoded query value, same as the built-in
# url_encode filter, except it leaves "/" and "=" as literal characters
# instead of "%2F"/"%3D".
#
# Both are safe to leave as-is there: that format only splits a query string
# on "&" (into pairs), then splits each pair on its own first "=" (not any
# "=" that shows up later, inside the value) - so neither character can be
# mistaken for a delimiter. Used for the file path/name passed to
# /resources/external-file/ (see external-file-viewer.html), whose
# S3 paths are themselves built from repeated "key=value" segments
# (e.g. "organization=miaa/year=2024-2025/season=fall/...") - fully
# percent-encoding those tripled their length for no parsing benefit.
require "cgi"

module Jekyll
  module QueryEncodeFilter
    def query_encode(input)
      CGI.escape(input.to_s).gsub("%2F", "/").gsub("%3D", "=")
    end
  end
end

Liquid::Template.register_filter(Jekyll::QueryEncodeFilter)
