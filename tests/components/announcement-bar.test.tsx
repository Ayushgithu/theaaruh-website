import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnouncementBar } from "@/components/site/announcement-bar";

const items = [
  { id: "1", text: "Free delivery on every order", active: true },
  { id: "2", text: "Easy 7-day exchange", href: "/shop", active: true },
];

describe("<AnnouncementBar /> (scrolling top bar)", () => {
  it("renders nothing when there are no active messages", () => {
    const { container } = render(<AnnouncementBar items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every message inside an announcements region", () => {
    render(<AnnouncementBar items={items} />);
    expect(screen.getByRole("region", { name: "Announcements" })).toBeInTheDocument();
    expect(screen.getAllByText("Free delivery on every order").length).toBeGreaterThan(0);
  });

  it("repeats the row for a seamless loop, but screen readers only get it once", () => {
    render(<AnnouncementBar items={items} />);
    expect(screen.getAllByText("Free delivery on every order")).toHaveLength(2); // visual loop
    expect(screen.getAllByRole("list")).toHaveLength(1); // the duplicate is aria-hidden
  });

  it("turns a message with a link into a link", () => {
    render(<AnnouncementBar items={items} />);
    expect(screen.getByRole("link", { name: "Easy 7-day exchange" })).toHaveAttribute("href", "/shop");
    expect(screen.queryByRole("link", { name: "Free delivery on every order" })).not.toBeInTheDocument();
  });

  it("uses a slower scroll for longer text", () => {
    const { container, rerender } = render(<AnnouncementBar items={[{ id: "1", text: "Short offer today", active: true }]} />);
    const speed = () => (container.querySelector(".animate-marquee") as HTMLElement).style.getPropertyValue("--marquee-duration");
    const short = parseInt(speed());
    rerender(<AnnouncementBar items={[{ id: "1", text: "A".repeat(150), active: true }, { id: "2", text: "B".repeat(150), active: true }]} />);
    expect(parseInt(speed())).toBeGreaterThan(short);
  });

  it("pauses on hover and respects reduced motion (CSS classes present)", () => {
    const { container } = render(<AnnouncementBar items={items} />);
    const track = container.querySelector(".animate-marquee")!;
    expect(track.className).toContain("group-hover:[animation-play-state:paused]");
    expect(track.className).toContain("motion-reduce:animate-none");
  });
});