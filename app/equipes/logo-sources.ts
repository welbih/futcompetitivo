export const teamLogoRemotePatterns = [
  new URL("https://logodownload.org/wp-content/uploads/**"),
  new URL("https://raw.githubusercontent.com/luukhopman/football-logos/**"),
];

export function canOptimizeTeamLogo(src: string) {
  try {
    const url = new URL(src);
    return !url.username && !url.password && !url.hash && teamLogoRemotePatterns.some(pattern =>
      url.origin === pattern.origin &&
      url.pathname.startsWith(pattern.pathname.slice(0, -2)) &&
      url.search === pattern.search
    );
  } catch {
    return false;
  }
}
