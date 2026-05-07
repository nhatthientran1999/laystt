path = r'e:\LamChoBanBe\laystt-main\src\routes\quay.tsx'
content = open(path, encoding='utf-8').read()

old = (
    "                 <td className=\"px-6 py-5\">\r\n"
    "                    {h.status === 'served' ? (\r\n"
    "                      <span className=\"px-2.5 py-1 rounded-lg bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase\">Đã phục vụ</span>\r\n"
    "                    ) : (\r\n"
    "                      <span className=\"px-2.5 py-1 rounded-lg bg-red-50 text-[9px] font-black text-red-600 uppercase\">Bỏ qua</span>\r\n"
    "                    )}\r\n"
    "                 </td>"
)

new = (
    "                 <td className=\"px-6 py-5\">\r\n"
    "                    {h.status === 'served' ? (\r\n"
    "                      <span className=\"px-2.5 py-1 rounded-lg bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase\">Đã hoàn tất</span>\r\n"
    "                    ) : h.status === 'skipped' ? (\r\n"
    "                      <span className=\"px-2.5 py-1 rounded-lg bg-amber-50 text-[9px] font-black text-amber-600 uppercase\">Vắng mặt (đang chờ)</span>\r\n"
    "                    ) : (\r\n"
    "                      <span className=\"px-2.5 py-1 rounded-lg bg-red-50 text-[9px] font-black text-red-600 uppercase\">Đã hủy</span>\r\n"
    "                    )}\r\n"
    "                 </td>"
)

result = content.replace(old, new)
print('Replaced!' if result != content else 'NOT FOUND - checking...')
if result == content:
    # Try LF version
    old_lf = old.replace('\r\n', '\n')
    new_lf = new.replace('\r\n', '\n')
    result = content.replace(old_lf, new_lf)
    print('LF Replaced!' if result != content else 'Still not found')

open(path, 'w', encoding='utf-8').write(result)
