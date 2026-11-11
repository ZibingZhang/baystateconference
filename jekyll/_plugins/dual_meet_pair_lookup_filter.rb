# Builds a Team-1/Team-2 pair lookup for dual-meet-results-group.html's
# head-to-head matrix, so each matrix cell can find its meet with a hash
# lookup instead of scanning every meet with the `where` filter twice -
# the matrix loop is O(teams^2), and scanning was O(meets) per cell.
module DualMeetPairLookup
  def dual_meet_pair_lookup(meets)
    return {} unless meets

    lookup = {}
    meets.each do |meet|
      key = "#{meet["Team 1"]}|#{meet["Team 2"]}"
      lookup[key] ||= meet
    end
    lookup
  end
end

Liquid::Template.register_filter(DualMeetPairLookup)
