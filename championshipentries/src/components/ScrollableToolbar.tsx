import { useEffect, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const SCROLL_STEP = 150;

/**
 * Wraps a row of controls (e.g. the grid toolbar buttons) in a horizontally
 * scrollable strip with left/right scroll buttons that appear only while the
 * content actually overflows — mirrors MUI `Tabs`' own `scrollButtons="auto"`
 * affordance, since a bare `overflowX: auto` row scrolls but gives no visual
 * hint that there's more to see on a narrow screen.
 */
function ScrollableToolbar({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const updateScrollState = () => {
    const el = containerRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth + 1);
    setAtStart(el.scrollLeft <= 0);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  useEffect(() => {
    updateScrollState();
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollBy = (direction: 1 | -1) =>
    containerRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });

  return (
    <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
      {overflowing && (
        <IconButton
          size="small"
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          sx={{ flexShrink: 0 }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      )}
      <Box
        ref={containerRef}
        onScroll={updateScrollState}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "nowrap",
          overflowX: "auto",
          minWidth: 0,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          "& > *": { flexShrink: 0 },
        }}
      >
        {children}
      </Box>
      {overflowing && (
        <IconButton
          size="small"
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          sx={{ flexShrink: 0 }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}

export default ScrollableToolbar;
