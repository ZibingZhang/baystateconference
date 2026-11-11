# Resolves a dot-separated "site.data.foo.bar" path string (as used by
# award.html's `recipients_data` front matter) against the actual data hash
# in plain Ruby. Doing this walk in Liquid itself - `assign x = site.data`
# followed by `x[part]` in a loop - is surprisingly expensive: each access
# re-resolves the whole data tree through Liquid's drop/variable-lookup
# machinery instead of a plain Hash#[].
module SiteDataLookupFilter
  def lookup_site_data(path_string, data)
    return nil unless path_string && data

    parts = path_string.sub(/\Asite\.data\./, "").split(".")
    parts.reduce(data) { |acc, part| acc.nil? ? nil : acc[part] }
  end
end

Liquid::Template.register_filter(SiteDataLookupFilter)
