export function getJoinedDate(options: Intl.DateTimeFormatOptions[], separator: string = " | ") {
  function format(option: Intl.DateTimeFormatOptions) {
    const formatter = new Intl.DateTimeFormat("en", option);
    return formatter.format(new Date());
  }
  return options.map(format).join(separator);
}
