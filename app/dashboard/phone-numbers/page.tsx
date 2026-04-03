import { auth } from "@/lib/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentTenantId } from "@/lib/tenant";
import { listTenantPhoneNumbers } from "@/lib/tenant-phone-numbers";

export default async function PhoneNumbersPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const phoneNumbers = await listTenantPhoneNumbers(tenantId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">My Phone Numbers</h1>
        <p className="text-zinc-500 mt-1">Buy and view your phone numbers</p>
      </div>

      <div className="pt-8">
        {/* Section Divider with Text */}
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
          <span className="flex-shrink-0 mx-4 text-sm font-medium text-blue-600 dark:text-blue-500 uppercase tracking-wider">
            NUMBERS OWNED WITH YOU FROM YOUR CONNECTED TELEPHONY ACCOUNTS
          </span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
        </div>

        {/* Phone Numbers Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 mt-6 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-transparent">
                <TableHead className="font-medium h-12">Phone number</TableHead>
                <TableHead className="font-medium h-12">Agent answering this phone number</TableHead>
                <TableHead className="font-medium h-12">Telephony Provider</TableHead>
                <TableHead className="font-medium h-12">Unlink Agent from Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phoneNumbers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                    No data available.
                  </TableCell>
                </TableRow>
              ) : (
                phoneNumbers.map((num, idx) => (
                  <TableRow key={num.phone_number || idx}>
                    <TableCell className="font-medium">{num.phone_number}</TableCell>
                    <TableCell className="text-zinc-500">
                      -
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {num.telephony_provider || "bolna"}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      n/a
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
