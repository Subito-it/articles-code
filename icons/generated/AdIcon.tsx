import type { SVGProps } from "react";
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgAdIcon = ({
  title,
  titleId,
  ...props
}: SVGProps<SVGSVGElement> & SVGRProps) => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" role="img" aria-labelledby={titleId} {...props}>{title ? <title id={titleId}>{title}</title> : null}<path d="M12.667 1.333c.736 0 1.333.597 1.333 1.334v10.666c0 .737-.597 1.334-1.333 1.334H3.333A1.333 1.333 0 0 1 2 13.333V2.667c0-.737.597-1.334 1.333-1.334zm0 1.334H3.333v10.666h9.334zm-2.667 8A.667.667 0 1 1 10 12H4.667a.666.666 0 1 1 0-1.333zm1.333-2a.666.666 0 1 1 0 1.333H4.667a.666.666 0 1 1 0-1.333zm0-5.334c.369 0 .667.299.667.667v3.333a.666.666 0 0 1-.667.667H4.667A.666.666 0 0 1 4 7.333V4c0-.368.298-.667.667-.667zm-.666 1.334H5.333v2h5.334z" /></svg>;
export default SvgAdIcon;