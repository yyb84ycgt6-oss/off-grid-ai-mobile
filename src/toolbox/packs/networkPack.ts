/**
 * Network Calc pack — IPv4/CIDR math, subnetting, MAC, and address helpers.
 * Pure arithmetic on addresses; no packets are sent (fully offline).
 */
import { ToolboxTool } from '../types';

const t = (
  id: string,
  name: string,
  description: string,
  inputHint: string,
  run: (s: string) => string,
  tags: string[] = [],
  example?: string
): ToolboxTool => ({
  id, name, description, category: 'network', tags: ['network', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const ipToInt = (ip: string): number | null => {
  const p = ip.trim().split('.').map(Number);
  if (p.length !== 4 || p.some((o) => isNaN(o) || o < 0 || o > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
};
const intToIp = (n: number): string => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

export const networkPack: ToolboxTool[] = [
  t('net-cidr', 'CIDR Subnet Calculator', 'Break down a CIDR block into its address range.', 'e.g. 192.168.1.0/24', (s) => {
    const [ip, bitsStr] = s.trim().split('/');
    const base = ipToInt(ip); const bits = parseInt(bitsStr, 10);
    if (base === null || isNaN(bits) || bits < 0 || bits > 32) return 'Format: A.B.C.D/prefix  (e.g. 192.168.1.0/24)';
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    const network = (base & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const total = Math.pow(2, 32 - bits);
    const usable = bits >= 31 ? total : total - 2;
    return `Network:    ${intToIp(network)}\nBroadcast:  ${intToIp(broadcast)}\nNetmask:    ${intToIp(mask)}\nWildcard:   ${intToIp(~mask >>> 0)}\nFirst host: ${intToIp(bits >= 31 ? network : network + 1)}\nLast host:  ${intToIp(bits >= 31 ? broadcast : broadcast - 1)}\nTotal IPs:  ${total.toLocaleString()}\nUsable:     ${Math.max(0, usable).toLocaleString()}`;
  }, ['cidr', 'subnet'], '192.168.1.0/24'),
  t('net-ip-to-int', 'IPv4 → Integer', 'Convert a dotted IPv4 address to a 32-bit integer.', 'an IPv4 address', (s) => {
    const n = ipToInt(s); return n === null ? 'Enter a valid IPv4 address.' : `${s.trim()} = ${n} (0x${n.toString(16).toUpperCase()})`;
  }, ['convert'], '192.168.1.1'),
  t('net-int-to-ip', 'Integer → IPv4', 'Convert a 32-bit integer to a dotted IPv4 address.', 'a 32-bit integer', (s) => {
    const n = parseInt(s.trim(), 10); if (isNaN(n) || n < 0 || n > 4294967295) return 'Enter an integer 0-4294967295.';
    return intToIp(n >>> 0);
  }, ['convert'], '3232235777'),
  t('net-ip-class', 'IPv4 Class & Type', 'Identify an address class and whether it is private.', 'an IPv4 address', (s) => {
    const n = ipToInt(s); if (n === null) return 'Enter a valid IPv4 address.';
    const first = (n >>> 24) & 255;
    const cls = first < 128 ? 'A' : first < 192 ? 'B' : first < 224 ? 'C' : first < 240 ? 'D (multicast)' : 'E (reserved)';
    const priv = (first === 10) || (first === 172 && ((n >>> 16) & 255) >= 16 && ((n >>> 16) & 255) <= 31) || (first === 192 && ((n >>> 16) & 255) === 168);
    const special = first === 127 ? 'Loopback' : (first === 169 && ((n >>> 16) & 255) === 254) ? 'Link-local (APIPA)' : priv ? 'Private (RFC 1918)' : 'Public';
    return `Class: ${cls}\nScope: ${special}`;
  }, ['classify'], '10.0.0.5'),
  t('net-mask-to-cidr', 'Netmask → CIDR', 'Convert a dotted netmask to a prefix length.', 'a netmask (e.g. 255.255.255.0)', (s) => {
    const n = ipToInt(s); if (n === null) return 'Enter a valid netmask.';
    const bits = n.toString(2).padStart(32, '0');
    if (!/^1*0*$/.test(bits)) return 'That is not a contiguous netmask.';
    return `/${(bits.match(/1/g) || []).length}`;
  }, ['cidr'], '255.255.255.0'),
  t('net-cidr-to-mask', 'CIDR → Netmask', 'Convert a prefix length to a dotted netmask.', 'a prefix (0-32)', (s) => {
    const bits = parseInt(s.replace('/', '').trim(), 10); if (isNaN(bits) || bits < 0 || bits > 32) return 'Enter a prefix 0-32.';
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return `/${bits} = ${intToIp(mask)}`;
  }, ['cidr'], '24'),
  t('net-ip-in-range', 'IP In CIDR?', 'Check if an IP falls inside a CIDR block. Format: ip::cidr', 'ip::cidr', (s) => {
    const [ipStr, cidr] = s.split('::'); const ip = ipToInt((ipStr || '').trim());
    const [net, bitsStr] = (cidr || '').trim().split('/'); const base = ipToInt(net); const bits = parseInt(bitsStr, 10);
    if (ip === null || base === null || isNaN(bits)) return 'Format: ip::network/prefix  (e.g. 192.168.1.50::192.168.1.0/24)';
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((ip & mask) >>> 0) === ((base & mask) >>> 0) ? `YES — ${ipStr.trim()} is inside ${cidr.trim()}` : `NO — ${ipStr.trim()} is outside ${cidr.trim()}`;
  }, ['cidr'], '192.168.1.50::192.168.1.0/24'),
  t('net-subnets', 'Split Into Subnets', 'Divide a network into equal subnets. Format: cidr::newPrefix', 'cidr::newPrefix', (s) => {
    const [cidr, newP] = s.split('::'); const [net, bitsStr] = (cidr || '').trim().split('/');
    const base = ipToInt(net); const bits = parseInt(bitsStr, 10); const np = parseInt(newP, 10);
    if (base === null || isNaN(bits) || isNaN(np) || np < bits || np > 32) return 'Format: network/prefix::newPrefix  (e.g. 10.0.0.0/24::26)';
    const count = Math.pow(2, np - bits);
    if (count > 256) return `That produces ${count} subnets — narrow the split (max 256 shown).`;
    const size = Math.pow(2, 32 - np);
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    const start = (base & mask) >>> 0;
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(`${intToIp((start + i * size) >>> 0)}/${np}`);
    return `${count} subnets of /${np}:\n` + out.join('\n');
  }, ['subnet'], '10.0.0.0/24::26'),
  t('net-mac-format', 'MAC Address Formatter', 'Normalize a MAC and show its OUI/vendor bits.', 'a MAC address', (s) => {
    const hex = s.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (hex.length !== 12) return 'Enter a 48-bit MAC (12 hex digits).';
    const pairs = hex.match(/.{2}/g)!;
    const first = parseInt(pairs[0], 16);
    return `Colon:  ${pairs.join(':')}\nHyphen: ${pairs.join('-')}\nDot:    ${hex.match(/.{4}/g)!.join('.').toLowerCase()}\nOUI:    ${pairs.slice(0, 3).join(':')}\nType:   ${first & 1 ? 'Multicast' : 'Unicast'}, ${first & 2 ? 'Locally administered' : 'Globally unique'}`;
  }, ['mac'], '00:1A:2B:3C:4D:5E'),
  t('net-port-info', 'Well-Known Port Lookup', 'Identify the common service for a port number.', 'a port number', (s) => {
    const ports: Record<string, string> = { '20': 'FTP data', '21': 'FTP control', '22': 'SSH', '23': 'Telnet', '25': 'SMTP', '53': 'DNS', '67': 'DHCP server', '68': 'DHCP client', '80': 'HTTP', '110': 'POP3', '123': 'NTP', '143': 'IMAP', '161': 'SNMP', '389': 'LDAP', '443': 'HTTPS', '445': 'SMB', '587': 'SMTP (submission)', '993': 'IMAPS', '995': 'POP3S', '1433': 'MS SQL', '1521': 'Oracle DB', '3306': 'MySQL', '3389': 'RDP', '5432': 'PostgreSQL', '5900': 'VNC', '6379': 'Redis', '8080': 'HTTP alt', '8443': 'HTTPS alt', '27017': 'MongoDB' };
    const p = s.trim();
    const known = ports[p] ? `Service: ${ports[p]}` : 'No well-known service (registered/dynamic range).';
    const n = parseInt(p, 10);
    const range = isNaN(n) ? '' : `\nRange: ${n < 1024 ? 'Well-known (0-1023)' : n < 49152 ? 'Registered (1024-49151)' : 'Dynamic/ephemeral (49152-65535)'}`;
    return known + range;
  }, ['ports'], '443'),
  t('net-ipv6-expand', 'Expand IPv6', 'Expand a compressed IPv6 address to full form.', 'an IPv6 address', (s) => {
    let ip = s.trim();
    if (!ip.includes(':')) return 'Enter an IPv6 address (e.g. 2001:db8::1).';
    if (ip.includes('::')) {
      const [head, tail] = ip.split('::');
      const h = head ? head.split(':') : []; const tl = tail ? tail.split(':') : [];
      const missing = 8 - h.length - tl.length;
      ip = [...h, ...Array(missing).fill('0'), ...tl].join(':');
    }
    const groups = ip.split(':');
    if (groups.length !== 8) return 'Malformed IPv6 address.';
    return groups.map((g) => g.padStart(4, '0')).join(':');
  }, ['ipv6'], '2001:db8::1'),
];
